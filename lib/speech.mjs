import fsp from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {RenderInternals} from '@remotion/renderer';
import {EdgeTTS} from 'node-edge-tts';
const execFileAsync=promisify(execFile);
export const escapeXml=s=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
export function chooseProvider(config,env=process.env) {
  const provider=env.VOICE_PROVIDER||config.voiceProvider||'auto';
  if(!['auto','azure','edge'].includes(provider))throw Error('VOICE_PROVIDER phải là auto, azure hoặc edge');
  return provider==='auto'?(env.AZURE_SPEECH_KEY?'azure':'edge'):provider;
}
export function createSynthesizer(provider,config) {
  const voice=process.env.AZURE_SPEECH_VOICE||'vi-VN-NamMinhNeural';
  return {
    async synthesize(text,dest,{kind}={}) {
      const rate=kind==='command'?'0%':config.voiceRate,pitch=config.voicePitch;
      if(provider==='azure') {
        if(!process.env.AZURE_SPEECH_KEY)throw Error('VOICE_PROVIDER=azure cần AZURE_SPEECH_KEY');
        const region=process.env.AZURE_SPEECH_REGION||'southeastasia';
        if(!/^[a-z0-9-]+$/.test(region))throw Error('Azure region không hợp lệ');
        const body=`<speak version="1.0" xml:lang="vi-VN"><voice name="${escapeXml(voice)}"><prosody rate="${escapeXml(rate)}" pitch="${escapeXml(pitch)}">${escapeXml(text)}</prosody></voice></speak>`;
        const r=await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':process.env.AZURE_SPEECH_KEY,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'riff-24khz-16bit-mono-pcm','User-Agent':'BodyForgeReels'},body,signal:AbortSignal.timeout(60000)});
        if(!r.ok)throw Error('Azure Speech HTTP '+r.status+'; kiểm tra key, region và hạn mức');
        await fsp.writeFile(dest,Buffer.from(await r.arrayBuffer()));
      }else {
        const temp=dest+'.mp3';
        try {
          const edge=new EdgeTTS({voice,lang:'vi-VN',outputFormat:'audio-24khz-96kbitrate-mono-mp3',rate,pitch,volume:'default',timeout:60000});
          await edge.ttsPromise(text,temp);
          const ffmpeg=process.env.FFMPEG_PATH||RenderInternals.getExecutablePath({type:'ffmpeg',indent:false,logLevel:'error',binariesDirectory:null});
          await execFileAsync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',temp,'-ar','24000','-ac','1','-c:a','pcm_s16le',dest],{windowsHide:true,timeout:60000});
        }finally {await fsp.rm(temp,{force:true});await new Promise(resolve=>setTimeout(resolve,2000));}
      }
    },
    close(){}
  };
}
