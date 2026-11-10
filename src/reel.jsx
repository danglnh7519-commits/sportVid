import React from 'react';
import {AbsoluteFill,Audio,Img,Sequence,interpolate,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';

const lime='#d1ff45', muted='#9da9b2';
const text={fontFamily:'"Segoe UI", Arial, sans-serif',color:'#f6f7ef'};
function Caption({scene}) {
  const f=useCurrentFrame(),{fps}=useVideoConfig();
  const c=scene.captions?.find(c=>f/fps>=c.from&&f/fps<c.from+c.duration);
  if(!c)return null;
  return <div style={{position:'absolute',left:0,right:0,bottom:0,minHeight:160,display:'flex',alignItems:'center',padding:'24px 32px',background:c.kind==='command'?'#243923':'#17232c',borderLeft:`7px solid ${lime}`,borderRadius:18,fontSize:c.kind==='command'?42:35,lineHeight:1.3,fontWeight:c.kind==='command'?800:600}}>{c.text}</div>;
}
function Scene({scene,video}) {
  const frame=useCurrentFrame(),{fps}=useVideoConfig();
  const enter=interpolate(frame,[0,14],[0,1],{extrapolateRight:'clamp'});
  const total=scene.durationInFrames;
  const progress=frame/total;
  const ex=scene.exercise;
  const cue=scene.cueEvents?.find(c=>frame/fps>=c.from&&frame/fps<c.from+c.duration);
  const activeCaption=scene.captions?.find(c=>frame/fps>=c.from&&frame/fps<c.from+c.duration);
  const benefit=activeCaption?.kind==='benefit';
  const image=ex?.images?.[Math.min(ex.images.length-1,Math.floor(frame/(fps*4))%ex.images.length)];
  return <AbsoluteFill style={{...text,padding:'0 0 0',opacity:enter,transform:`translateY(${(1-enter)*24}px)`}}>
    <div style={{position:'absolute',top:0,left:0,right:0,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:29,letterSpacing:4,color:lime,fontWeight:800}}>{video.brand}<span style={{color:'#fff'}}> / </span>TRAINING</span>
      <span style={{fontSize:24,color:muted}}><span style={{color:lime}}>●</span> DAILY</span>
    </div>
    <div style={{position:'absolute',top:80,fontSize:25,letterSpacing:5,color:muted,fontWeight:700}}>{video.goal} <span style={{color:lime}}> / </span> {scene.kind==='exercise'?'KỸ THUẬT & KIỂM SOÁT':'TẬP CÓ MỤC TIÊU'}</div>
    {scene.kind==='exercise'?<>
      <div style={{position:'absolute',top:145,fontSize:54,fontWeight:800,maxWidth:840,lineHeight:1.12}}>{scene.title}</div>
      <div style={{position:'absolute',top:285,left:0,right:0,height:660,borderRadius:32,overflow:'hidden',background:'#242f38',border:'1px solid #39464c'}}>
        {image?<Img src={staticFile(image)} style={{width:'100%',height:'100%',objectFit:'contain',transform:`scale(${1+progress*0.025})`}}/>:<div style={{padding:70,fontSize:46,lineHeight:1.5,color:lime}}>THIẾU HÌNH MINH HỌA<br/>Chạy đồng bộ Drive trước khi xuất bản.</div>}
        <div style={{position:'absolute',top:24,left:24,background:lime,color:'#111b23',fontSize:23,fontWeight:800,padding:'12px 18px',borderRadius:10}}>{ex.muscles}</div>
        {cue&&<div style={{position:'absolute',top:24,right:24,background:'#101b22',color:lime,border:'1px solid #799447',borderRadius:12,padding:'12px 20px',fontSize:30,fontWeight:800}}>{cue.round?'NHỊP '+cue.round+' / ':''}{Math.max(1,Math.ceil(cue.from+cue.duration-frame/fps))}s</div>}
        <div style={{position:'absolute',bottom:20,left:24,right:24,display:'flex',gap:10}}>{ex.images?.map((_,i)=><div key={i} style={{height:5,flex:1,borderRadius:3,background:ex.images[i]===image?lime:'#65727b'}}/>)}</div>
      </div>
      <div style={{position:'absolute',top:965,fontSize:21,color:muted}}>MINH HỌA TƯ THẾ • KHÔNG PHẢI CHUYỂN ĐỘNG LIÊN TỤC</div>
      <div style={{position:'absolute',top:1010,fontSize:cue?35:37,fontWeight:800,color:lime,maxWidth:850,lineHeight:1.15}}>{cue?.label||(benefit?ex.coaching?.benefitTitle:ex.cue)}</div>
      <div style={{position:'absolute',top:1080,fontSize:34}}>{ex.dose}</div>
      <div style={{position:'absolute',top:1140,fontSize:27,color:muted,maxWidth:820,lineHeight:1.4}}>{benefit?'TẬP ĐỀU • TĂNG ĐỘ KHÓ PHÙ HỢP • HỒI PHỤC ĐỦ':ex.mistake}</div>
    </>:<>
      <div style={{position:'absolute',top:180,fontSize:scene.kind==='principle'?75:94,lineHeight:1.07,whiteSpace:'pre-line',fontWeight:900,letterSpacing:-3,maxWidth:850}}>{scene.title}</div>
      <div style={{position:'absolute',top:480,left:80,width:660,height:660,borderRadius:'50%',border:'2px solid #35432c',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="640" height="640" viewBox="0 0 640 640" style={{transform:`rotate(${frame/10}deg)`}}><circle cx="320" cy="320" r="280" fill="none" stroke="#26352a" strokeWidth="25"/><circle cx="320" cy="320" r="280" fill="none" stroke={lime} strokeWidth="25" strokeDasharray="820 1800" strokeLinecap="round"/><circle cx="320" cy="320" r="210" fill="none" stroke="#526044" strokeWidth="2" strokeDasharray="6 16"/></svg>
        <div style={{position:'absolute',textAlign:'center'}}><div style={{fontSize:130,fontWeight:900,color:lime}}>{scene.kind==='hook'?'01':scene.kind==='outro'?'→':'+'}</div><div style={{fontSize:26,letterSpacing:4}}>{scene.kind==='outro'?'LƯU & CHIA SẺ':'MỖI NGÀY MỘT BƯỚC'}</div></div>
      </div>
      <div style={{position:'absolute',top:1180,color:muted,fontSize:30,letterSpacing:4}}>{video.tagline}</div>
    </>}
    <Caption scene={scene}/>
    {scene.voices?.map((v,i)=><Sequence key={i} from={Math.round(v.from*fps)} durationInFrames={Math.ceil(v.duration*fps)}><Audio src={staticFile(v.src)} volume={1}/></Sequence>)}
  </AbsoluteFill>;
}
export function Reel(video) {
  const frame=useCurrentFrame(),{durationInFrames}=useVideoConfig();
  const current=video.scenes.find(s=>frame>=s.from&&frame<s.from+s.durationInFrames);
  // Reduce music during narration and fade both ends to avoid abrupt edits.
  const firstVoice=current?.voices?.[0],lastVoice=current?.voices?.at(-1);
  const speaking=firstVoice&&frame>=current.from+firstVoice.from*video.fps&&frame<current.from+(lastVoice.from+lastVoice.duration)*video.fps;
  return <AbsoluteFill style={{...text,background:'#0c141c',overflow:'hidden'}}>
    <div style={{position:'absolute',left:0,right:0,top:0,height:11,background:'#263328'}}><div style={{height:'100%',width:`${frame/durationInFrames*100}%`,background:lime}}/></div>
    <div style={{position:'absolute',right:-180,top:140,width:700,height:700,border:'1px solid #1d3028',borderRadius:'50%'}}/>
    <div style={{position:'absolute',left:76,right:140,top:180,bottom:340}}>
      {video.scenes.map((scene,i)=><Sequence key={i} from={scene.from} durationInFrames={scene.durationInFrames}><Scene scene={scene} video={video}/></Sequence>)}
    </div>
    <div style={{position:'absolute',bottom:273,left:76,right:140,fontSize:20,color:muted}}>{current?.exercise?.credit||'NỘI DUNG THAM KHẢO • ĐIỀU CHỈNH THEO THỂ TRẠNG'}</div>
    {video.demo&&<div style={{position:'absolute',top:86,left:76,color:lime,fontSize:22,letterSpacing:2}}>BẢN XEM TRƯỚC • CHƯA CÓ GIỌNG ĐỌC</div>}
    {video.music&&<Audio src={staticFile(video.music)} volume={f=>video.musicVolume*(speaking?0.45:1)*Math.max(0,Math.min(1,f/60,(durationInFrames-f)/90))}/>}
  </AbsoluteFill>;
}
