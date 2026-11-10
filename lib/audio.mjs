import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import {at,exists} from './files.mjs';
import {chooseProvider,createSynthesizer} from './speech.mjs';
export {escapeXml} from './speech.mjs';
export function wavDuration(b) {
  if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error('Voice cần là WAV PCM');
  let rate=0,data=0;
  for(let i=12;i+8<=b.length;) {
    const size=b.readUInt32LE(i+4),tag=b.toString('ascii',i,i+4);
    if(tag==='fmt ') {if(size<16||i+8+size>b.length)throw Error('WAV lỗi');if(b.readUInt16LE(i+8)!==1)throw Error('WAV cần PCM không nén');rate=b.readUInt32LE(i+16);}
    if(tag==='data')data=Math.min(size,b.length-i-8);
    i+=8+size+(size%2);
  }
  if(!rate||!data)throw Error('WAV thiếu dữ liệu');return data/rate;
}
export function splitNarration(s) {
  // Each chunk is synthesized separately; caption boundaries therefore use real audio durations.
  return s.match(/[^.!?]+[.!?]?/g)?.map(s=>s.trim()).filter(Boolean)||[];
}
export function narrationUnits(scene) {
  if(!scene.segments)return splitNarration(scene.narration).map(text=>({text}));
  return scene.segments.flatMap(segment=>segment.kind==='command'?[segment]:splitNarration(segment.text).map(text=>({...segment,text})));
}
export async function prepareVoice(video,config,jobDir,{demo=false,voiceDir}={}) {
  const provider=voiceDir?'recorded':demo?'none':chooseProvider(config);
  video.voiceProvider=provider;
  const synthesizer=demo||voiceDir?null:createSynthesizer(provider,config);
  await fs.mkdir(at('public/audio'),{recursive:true});
  const script=[];
  try {
  for(const [i,scene] of video.scenes.entries()) {
    const chunks=narrationUnits(scene);let offset=0;
    scene.captions=[];scene.voices=[];scene.cueEvents=[];
    for(const [j,unit] of chunks.entries()) {
      const {text}=unit;
      const label=`scene-${i+1}-${j+1}.wav`;script.push({file:label,...unit});
      if(demo) {const duration=scene.seconds/chunks.length;scene.captions.push({text,from:offset,duration});if(unit.kind==='command')scene.cueEvents.push({...unit,from:offset,duration});offset+=duration;continue;}
      const voice=process.env.AZURE_SPEECH_VOICE||'vi-VN-NamMinhNeural';
      const key=crypto.createHash('sha256').update(JSON.stringify({text,voice,provider,kind:unit.kind,rate:config.voiceRate,pitch:config.voicePitch,voiceDir:voiceDir||''})).digest('hex').slice(0,24);
      const filename=key+'.wav',dest=at('public/audio',filename);
      if(voiceDir)await fs.copyFile(path.resolve(voiceDir,label),dest);
      else if(!await exists(dest)) {
        console.log(`Voice ${i+1}/${video.scenes.length}, câu ${j+1}/${chunks.length}`);
        let failure;
        for(let attempt=0;attempt<(provider==='edge'?3:1);attempt++) {
          try {await synthesizer.synthesize(text,dest,unit);failure=null;break;}
          catch(error) {failure=error;await fs.rm(dest,{force:true});console.warn(`Voice chưa hoàn tất, lần ${attempt+1}: ${error.message}`);if(provider==='edge'&&attempt<2)await new Promise(resolve=>setTimeout(resolve,(/429/.test(error.message)?15000:2000)*(attempt+1)));}
        }
        if(failure)throw failure;
      }
      const duration=wavDuration(await fs.readFile(dest));
      const span=Math.max(duration,unit.holdSeconds||0);
      scene.voices.push({src:'audio/'+filename,from:offset,duration});
      scene.captions.push({text,from:offset,duration:span,kind:unit.kind});
      if(unit.kind==='command')scene.cueEvents.push({...unit,from:offset,duration:span});
      offset+=span+0.18;
    }
    if(!demo)scene.seconds=Math.max(scene.seconds,offset+0.6);
  }
  await fs.writeFile(jobDir+'/voice-script.json',JSON.stringify(script,null,2));
  }finally {synthesizer?.close();}
}
export async function makeMusic(seconds) {
  // Original deterministic synthesis. No samples, melodies or third-party recordings.
  const sr=24000,n=Math.ceil(seconds*sr),b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
  let seed=12345;const beat=60/104,notes=[55,65.406,73.416,49];
  for(let i=0;i<n;i++) {
    const t=i/sr,p=t%beat,bar=Math.floor(t/(beat*4)),freq=notes[bar%notes.length];
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/4294967296*2-1;
    const kick=Math.sin(2*Math.PI*(48*p+7*(1-Math.exp(-p*30))))*Math.exp(-p*18)*0.48;
    const hat=noise*Math.exp(-(t%(beat/2))*160)*0.06;
    const bass=Math.sin(2*Math.PI*freq*t)*0.17*Math.exp(-p*4);
    const pad=(Math.sin(2*Math.PI*freq*2*t)+Math.sin(2*Math.PI*freq*3*t))*0.035;
    const fade=Math.min(1,t/2,(seconds-t)/3);
    b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,(kick+hat+bass+pad)*fade))*26000),44+i*2);
  }
  await fs.mkdir(at('public/audio'),{recursive:true});await fs.writeFile(at('public/audio/original-bed.wav'),b);
  return 'audio/original-bed.wav';
}
