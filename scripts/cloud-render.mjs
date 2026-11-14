import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {at,ROOT,readJson,writeJson} from '../lib/files.mjs';
import {dateInZone,dateNumber,selectTopic,makeVideo} from '../lib/planner.mjs';
const config=await readJson(at('config.json')),plan=await readJson(at(config.defaultPlan));
const exercises=await readJson(at('content/exercises.json')),coaching=await readJson(at('content/coaching.json'));
for(const [id,e] of Object.entries(exercises))e.coaching=coaching[id];
const date=process.env.RENDER_DATE||dateInZone(new Date(),config.timezone);dateNumber(date);
const localOutput = process.argv[2];
const manual = process.argv[3] === '--manual';
if (manual && !localOutput) throw Error('Cần thư mục lưu MP4 khi dựng thủ công.');
const manualId = manual ? randomUUID() : undefined;
const renderDir = at('renders', manual ? `manual-${manualId}` : date);
let topic=process.env.RENDER_TOPIC_ID?plan.topics.find(t=>t.id===process.env.RENDER_TOPIC_ID):selectTopic(plan,date);
if(!topic)throw Error('Chủ đề được yêu cầu không tồn tại.');
topic={...topic,...(process.env.RENDER_SECONDS?{seconds:Number(process.env.RENDER_SECONDS)}:{})};makeVideo(topic,exercises,config);
const provider=process.env.RENDER_VOICE_PROVIDER||config.voiceProvider||'auto';if(!['auto','azure','edge'].includes(provider))throw Error('Giọng đọc không hợp lệ.');
const cloudPlan=at(`renders/.run-plan-${process.pid}.json`);await writeJson(cloudPlan,{startDate:date,topics:[topic]});
async function cli(args){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[at('scripts/cli.mjs'),...args],{cwd:ROOT,env:process.env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Tác vụ dựng video thất bại.')));});}
try {
 if (!localOutput) {
  await cli(['sync-drive','--only',[...new Set(topic.exerciseIds)].join(',')]);
 }
 await cli(['daily','--date',date,'--plan',path.relative(ROOT,cloudPlan),'--voice',provider,...(localOutput ? ['--sync-media'] : []),...(manual ? ['--manual-id', manualId] : [])]);
 if (localOutput) {
  await fs.mkdir(localOutput, {recursive: true});
  const suffix = manual ? `-${topic.id.replace(/[^a-z0-9-]/gi, '-')}-${manualId.slice(0,8)}` : '';
  const destination = path.join(localOutput, `sportvid-${date}${suffix}.mp4`);
  const temporary = destination + '.' + process.pid + '.tmp';
  try {
   await fs.copyFile(path.join(renderDir, 'video.mp4'), temporary);
   await fs.rename(temporary, destination);
  } finally {
   await fs.rm(temporary, {force: true});
  }
  console.log('Đã lưu MP4:', destination);
 }
 if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,`render_dir=renders/${date}\nrender_date=${date}\ntopic_id=${topic.id}\n`);
 console.log('Kết quả:',at('renders',date));
}finally {await fs.rm(cloudPlan,{force:true});}
