import {makeVideo,dateNumber} from '../lib/planner.mjs';
export function validatePlan(plan,exercises,config) {
  if(!plan||typeof plan!=='object'||!Array.isArray(plan.topics)||!plan.topics.length||plan.topics.length>100)throw Error('Lộ trình cần từ 1 đến 100 chủ đề.');
  dateNumber(plan.startDate);
  const ids=new Set();
  const topics=plan.topics.map(topic=>{
    makeVideo(topic,exercises,config);
    if(topic.hook.length>400)throw Error('Lời mở đầu cần tối đa 400 ký tự.');
    if(ids.has(topic.id))throw Error('Mã chủ đề bị trùng.');ids.add(topic.id);
    if(topic.mode&&!['technique',''].includes(topic.mode))throw Error('Chế độ video không hợp lệ.');
    return {id:topic.id,goal:topic.goal,title:topic.title.trim(),hook:topic.hook.trim(),exerciseIds:topic.exerciseIds,seconds:topic.seconds,...(topic.mode?{mode:topic.mode}:{})};
  });
  return {startDate:plan.startDate,topics};
}
export function validateRender(input,plan) {
  const topicId=String(input.topicId||'');
  if(topicId&&!plan.topics.some(t=>t.id===topicId))throw Error('Chủ đề không tồn tại trong lộ trình đã lưu.');
  if(input.date)dateNumber(input.date);
  const seconds=input.seconds==null||input.seconds===''?'':Number(input.seconds);
  if(seconds!==''&&(!Number.isInteger(seconds)||seconds<60||seconds>150))throw Error('Thời lượng cần từ 60 đến 150 giây.');
  if(!['auto','edge','azure'].includes(input.voiceProvider||'auto'))throw Error('Giọng đọc không hợp lệ.');
  if(!['auto','yes','no'].includes(input.uploadDrive||'auto'))throw Error('Nơi lưu video không hợp lệ.');
  return {topic_id:topicId,render_date:input.date||'',duration_seconds:String(seconds),voice_provider:input.voiceProvider||'auto',upload_drive:input.uploadDrive||'auto'};
}
export function validateSettings(input,current) {
  const allowed=['brand','tagline','voiceProvider','voiceRate','voicePitch','musicVolume'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw Error('Cài đặt chứa trường không được hỗ trợ.');
  const next={...current,...input};
  if(typeof next.brand!=='string'||!next.brand.trim()||next.brand.length>32)throw Error('Tên kênh cần từ 1 đến 32 ký tự.');
  if(typeof next.tagline!=='string'||next.tagline.length>100)throw Error('Khẩu hiệu quá dài.');
  if(!['auto','edge','azure'].includes(next.voiceProvider))throw Error('Giọng đọc không hợp lệ.');
  for(const name of ['voiceRate','voicePitch'])if(!/^[+-]?\d{1,2}%$/.test(next[name])||Number(next[name].replace('%',''))< -20||Number(next[name].replace('%',''))>30)throw Error('Tốc độ và cao độ cần là phần trăm trong khoảng -20 đến +30.');
  if(typeof next.musicVolume!=='number'||next.musicVolume<0||next.musicVolume>0.4)throw Error('Âm lượng nhạc cần từ 0 đến 40%.');
  return next;
}
