import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJson,at} from '../lib/files.mjs';
import {selectTopic,makeVideo,applyTiming,dateInZone,dateNumber} from '../lib/planner.mjs';
import {parsePublicFolder} from '../lib/drive.mjs';
import {escapeXml,wavDuration,splitNarration,prepareVoice} from '../lib/audio.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chooseProvider} from '../lib/speech.mjs';
const config=await readJson(at('config.json')),exercises=await readJson(at('content/exercises.json')),plan=await readJson(at('content/rotation.json'));
const coaching=await readJson(at('content/coaching.json'));
for(const [id,exercise] of Object.entries(exercises))exercise.coaching=coaching[id];
test('Noon Vietnam date and rotation survive UTC date boundary',()=>{
  assert.equal(dateInZone(new Date('2026-11-04T18:00:00Z')),'2026-11-05');
  assert.equal(selectTopic(plan,'2026-11-05').id,plan.topics[0].id);
  assert.equal(selectTopic(plan,'2026-11-12').id,plan.topics[0].id);
  assert.throws(()=>selectTopic(plan,'2026-11-04'));
  assert.throws(()=>dateNumber('2026-02-30'));
});
test('Every seeded and custom topic makes contiguous 60–150 second timelines',async()=>{
  const custom=await readJson(at('content/custom-plan.example.json'));
  for(const topic of [...plan.topics,...custom.topics]) {
    const v=applyTiming(makeVideo(topic,exercises,config));
    assert.ok(v.durationInFrames>=1800&&v.durationInFrames<=4500);
    for(let i=1;i<v.scenes.length;i++)assert.equal(v.scenes[i].from,v.scenes[i-1].from+v.scenes[i-1].durationInFrames);
  }
});
test('Bad input and narration overflow cannot silently produce invalid videos',()=>{
  for(const patch of [{seconds:59},{seconds:151},{exerciseIds:['fake']},{goal:'magic'},{id:'../../escape'},{exerciseIds:[]}])assert.throws(()=>makeVideo({...plan.topics[0],...patch},exercises,config));
  const video=makeVideo(plan.topics[0],exercises,config);video.scenes[0].seconds=151;
  assert.throws(()=>applyTiming(video));
});
test('Every exercise has benefits and audible preparation, breathing/action and finish cues',()=>{
  for(const topic of plan.topics) {
    const v=makeVideo(topic,exercises,config);
    for(const scene of v.scenes.filter(s=>s.exercise)) {
      assert.ok(scene.segments.length);
      assert.ok(scene.exercise.coaching.sources.every(s=>s.startsWith('https://')));
    }
    const units=v.scenes.flatMap(s=>s.segments||[]);
    assert.ok(units.some(s=>s.kind==='benefit'));
    assert.ok(units.some(s=>s.kind==='command'&&s.holdSeconds>=1));
    assert.ok(units.some(s=>s.kind==='encouragement'));
  }
  assert.equal(chooseProvider({voiceProvider:'auto'},{}),'edge');
  assert.equal(chooseProvider({voiceProvider:'auto'},{AZURE_SPEECH_KEY:'test'}),'azure');
  assert.throws(()=>chooseProvider({voiceProvider:'invalid'},{}));
});
test('Drive HTML distinguishes folder names, notices and images',()=>{
  const html='<tr data-selectable data-id="abc"><div data-tooltip="Bodyweight Squat Shared folder"></div></tr><tr data-selectable data-id="def"><div data-tooltip="01 - Bodyweight Squat.png Image"></div></tr>';
  assert.deepEqual(parsePublicFolder(html),[{id:'abc',folder:true,name:'Bodyweight Squat'},{id:'def',folder:false,name:'01 - Bodyweight Squat.png'}]);
  assert.deepEqual(parsePublicFolder('<html>Login</html>'),[]);
});
test('PCM WAV timings use actual byte rate; SSML content stays escaped',()=>{
  const b=Buffer.alloc(44+48000);b.write('RIFF');b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt32LE(48000,28);b.write('data',36);b.writeUInt32LE(48000,40);
  assert.equal(wavDuration(b),1);assert.throws(()=>wavDuration(Buffer.from('not audio')));
  assert.equal(escapeXml('A & <B>'),'A &amp; &lt;B&gt;');
  assert.deepEqual(splitNarration('Giữ vững. Thở đều!'),['Giữ vững.','Thở đều!']);
});
test('Recorded narration drives real caption offsets and expands short scenes',async()=>{
  await fs.mkdir(at('.cache'),{recursive:true});
  const temp=await fs.mkdtemp(at('.cache/voice-test-'));
  try {
    const b=Buffer.alloc(44+96000);b.write('RIFF');b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt32LE(48000,28);b.write('data',36);b.writeUInt32LE(96000,40);
    await fs.writeFile(path.join(temp,'scene-1-1.wav'),b);await fs.writeFile(path.join(temp,'scene-1-2.wav'),b);
    const video={scenes:[{narration:'Giữ vững. Thở đều.',seconds:1}]};
    await prepareVoice(video,config,temp,{voiceDir:temp});
    assert.equal(video.scenes[0].voices.length,2);
    assert.equal(video.scenes[0].captions[0].duration,2);
    assert.equal(video.scenes[0].captions[1].from,2.18);
    assert.ok(video.scenes[0].seconds>4.36);
    for(const v of video.scenes[0].voices)await fs.rm(at('public',v.src),{force:true});
  }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('Command holds create actionable gaps without delaying captions or overlapping speech',async()=>{
  await fs.mkdir(at('.cache'),{recursive:true});const temp=await fs.mkdtemp(at('.cache/cue-test-'));
  try {
    const b=Buffer.alloc(44+48000);b.write('RIFF');b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt32LE(48000,28);b.write('data',36);b.writeUInt32LE(48000,40);
    for(const j of [1,2])await fs.writeFile(path.join(temp,`scene-1-${j}.wav`),b);
    const video={scenes:[{seconds:1,segments:[{text:'Hạ xuống.',kind:'command',label:'HẠ',holdSeconds:3},{text:'Đứng lên.',kind:'command',label:'LÊN',holdSeconds:2}]}]};
    await prepareVoice(video,config,temp,{voiceDir:temp});
    const s=video.scenes[0];assert.equal(s.voices[0].duration,1);assert.equal(s.cueEvents[0].duration,3);
    assert.equal(s.voices[1].from,3.18);assert.equal(s.captions[1].from,3.18);assert.equal(s.cueEvents[1].from,3.18);
    for(const v of s.voices)await fs.rm(at('public',v.src),{force:true});
  }finally {await fs.rm(temp,{recursive:true,force:true});}
});
