import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill,getVideoMetadata} from '@remotion/renderer';
import {ROOT,at,readJson,writeJson,exists,loadEnv} from '../lib/files.mjs';
import {selectTopic,makeVideo,applyTiming,dateInZone,dateNumber} from '../lib/planner.mjs';
import {syncDrive} from '../lib/drive.mjs';
import {prepareVoice,makeMusic,narrationUnits} from '../lib/audio.mjs';

await loadEnv();
const args=process.argv.slice(2),command=args.shift()||'plan';
function option(name,fallback) {const i=args.indexOf('--'+name);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Thiếu giá trị --'+name);return args[i+1];}
const config=await readJson(at('config.json')),exercises=await readJson(at('content/exercises.json'));
const coaching=await readJson(at('content/coaching.json'));
for(const [id,exercise] of Object.entries(exercises))exercise.coaching=coaching[id];
if(option('voice'))config.voiceProvider=option('voice');
async function syncSelected(ids) {
  const selected = ids.length ? Object.fromEntries(ids.map(id => {
    if (!exercises[id]) throw Error('Không có động tác ' + id);
    return [id, exercises[id]];
  })) : exercises;
  const manifest = at('public/media/manifest.json');
  const old = await exists(manifest) ? await readJson(manifest) : {exercises:{}};
  const data = await syncDrive(selected);
  data.exercises = {...old.exercises, ...data.exercises};
  await writeJson(manifest, data);
  console.log('Đã đồng bộ:', Object.keys(data.exercises).join(', '));
}
try {
  if(command==='sync-drive') {
    await syncSelected(option('only','').split(',').filter(Boolean));
  }else if(['plan','daily','demo'].includes(command)) {
    const demo=command==='demo',silent=demo&&args.includes('--silent'),date=option('date',dateInZone(new Date(),config.timezone));dateNumber(date);
    const plan=await readJson(path.resolve(ROOT,option('plan',config.defaultPlan)));
    const topic=demo?{...plan.topics[0],seconds:90}:selectTopic(plan,date);
    const video=makeVideo(topic,exercises,config);video.demo=silent;
    const manualId = option('manual-id');
    if (manualId && (command !== 'daily' || !/^[0-9a-f-]{36}$/.test(manualId))) throw Error('Mã lượt dựng thủ công không hợp lệ');
    const job=at('renders',manualId?`manual-${manualId}`:demo?'demo':date);await fs.mkdir(job,{recursive:true});
    if(command==='plan') {
      applyTiming(video);await writeJson(path.join(job,'plan.json'),video);
      const script=video.scenes.flatMap((s,i)=>narrationUnits(s).map((unit,j)=>({file:`scene-${i+1}-${j+1}.wav`,...unit})));
      await writeJson(path.join(job,'voice-script.json'),script);
      console.log('Đã chuẩn bị kịch bản:',path.join(job,'plan.json'));process.exit(0);
    }
    if(await exists(path.join(job,'complete.json'))&&!args.includes('--force')) {console.log('Video ngày này đã hoàn tất:',job);process.exit(0);}
    const lock=at('renders','render.lock');let handle;
    try {handle=await fs.open(lock,'wx');}catch(e){if(e.code==='EEXIST')throw Error('Có tác vụ đang dựng hoặc lock còn từ lần bị dừng. Kiểm tra tiến trình trước khi xóa '+lock);throw e;}
    try {
      await handle.writeFile(JSON.stringify({pid:process.pid,job,startedAt:new Date().toISOString()}));
      // A failed forced rebuild must remain retryable instead of keeping a stale success marker.
      if(args.includes('--force'))await fs.rm(path.join(job,'complete.json'),{force:true});
      if (args.includes('--sync-media')) await syncSelected([...new Set(topic.exerciseIds)]);
      if(!await exists(at('public/media/manifest.json')))throw Error('Chạy npm run sync-drive trước để tải hình từ Drive');
      const media=await readJson(at('public/media/manifest.json'));
      for(const scene of video.scenes)if(scene.exercise) {
        const asset=media.exercises[scene.exercise.id];
        if(!asset?.images?.length)throw Error('Thiếu hình: '+scene.exercise.id+'; chạy npm run sync-drive');
        for(const src of asset.images)if(!await exists(at('public',src)))throw Error('Không có ảnh '+src);
        Object.assign(scene.exercise,asset);
      }
      await prepareVoice(video,config,job,{demo:silent,voiceDir:option('voice-dir')});
      applyTiming(video);video.music=await makeMusic(video.durationInFrames/config.fps);
      await writeJson(path.join(job,'plan.json'),video);await writeJson(at('public/preview.json'),video);
      console.log('Chuẩn bị trình duyệt và animation...');
      const serveUrl=await bundle({entryPoint:at('src/index.jsx'),publicDir:at('public'),onProgress:p=>{if(p===100)console.log('Animation sẵn sàng.');}});
      const installedChrome=process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':null;
      const browserExecutable=process.env.CHROME_PATH||(installedChrome&&await exists(installedChrome)?installedChrome:null);
      const composition=await selectComposition({serveUrl,id:'BodyForge',inputProps:video,browserExecutable});
      const outputLocation=path.join(job,'video.mp4');
      let last=-10;
      await renderMedia({composition,serveUrl,inputProps:video,browserExecutable,codec:'h264',audioCodec:'aac',pixelFormat:'yuv420p',outputLocation,concurrency:4,crf:20,onProgress:({progress})=>{const p=Math.floor(progress*10)*10;if(p>last){last=p;console.log('Dựng video:',p+'%');}}});
      await renderStill({composition,serveUrl,inputProps:video,browserExecutable,output:path.join(job,'cover.png'),frame:Math.round((video.scenes[1]?.from||0)+video.fps*2),imageFormat:'png'});
      const metadata=await getVideoMetadata(outputLocation);
      if(metadata.durationInSeconds<59.9||metadata.durationInSeconds>150.1||metadata.width!==1080||metadata.height!==1920||metadata.audioCodec!=='aac')throw Error('MP4 không đạt kiểm tra thời lượng, khung hình hoặc âm thanh');
      const credits=[...new Set(video.scenes.filter(s=>s.exercise).map(s=>s.exercise.notice))];
      const sources=await Promise.all(credits.map(src=>fs.readFile(at('public',src),'utf8')));
      const usedAssets=[...new Map(video.scenes.filter(s=>s.exercise).map(s=>[s.exercise.id,s.exercise])).values()];
      const attribution=usedAssets.map(e=>`${e.vi}: ${e.credit}; ${e.source}; tệp dùng: ${(e.selectedFiles||e.images).join(', ')}`).join('\n');
      const benefitSources=usedAssets.map(e=>`${e.vi}: ${e.coaching.benefit}\nTham khảo: ${e.coaching.sources.join(', ')}\n${e.coaching.sourceNote||''}`).join('\n\n');
      await fs.writeFile(path.join(job,'exercise-benefits.txt'),benefitSources);
      await fs.writeFile(path.join(job,'CREDITS.txt'),'Hình được raster hóa, trình chiếu, crop/scale và chèn chữ.\n'+attribution+'\nVideo phát hành CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/\nNhạc nền: tổng hợp nguyên bản bằng mã nguồn BodyForgeReels, không dùng sample. Không bảo đảm hệ thống Content ID không nhầm lẫn.\n\n'+sources.join('\n\n'));
      await fs.writeFile(path.join(job,'caption.txt'),`${topic.title.replaceAll('\n',' ')}\n\n${topic.hook}\n\n${video.scenes.at(-2).narration}\n\nGợi ý tập luyện chung; điều chỉnh theo khả năng. Lưu lại để xem trước buổi tập.\n\n${attribution}\nVideo: CC BY-SA 4.0 • https://creativecommons.org/licenses/by-sa/4.0/\n#TapLuyen #BuildBody #TheHinh #BodyForge`);
      await writeJson(path.join(job,'complete.json'),{completedAt:new Date().toISOString(),topicId:topic.id,demo,voiceProvider:video.voiceProvider,voice:silent?'none':option('voice-dir')?'recorded':process.env.AZURE_SPEECH_VOICE||'vi-VN-NamMinhNeural',commandCount:video.scenes.reduce((n,s)=>n+(s.cueEvents?.length||0),0),metadata});
      console.log('Hoàn tất:',outputLocation);
    }finally {await handle.close();await fs.rm(lock,{force:true});}
  }else throw Error('Lệnh hợp lệ: sync-drive, plan, daily, demo');
}catch(e){console.error('LỖI:',e.message);process.exitCode=1;}
