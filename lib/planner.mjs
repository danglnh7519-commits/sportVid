import {buildCoaching} from './coaching.mjs';
export const GOALS = {
  'giam-can': {label:'GIẢM MỠ',note:'Tập kháng lực giúp duy trì sức mạnh khi giảm mỡ. Kết hợp vận động thường xuyên với chế độ ăn phù hợp; không có bài tập nào đốt mỡ riêng một vùng.'},
  'tang-can': {label:'TĂNG CÂN',note:'Tăng cân cần ăn đủ năng lượng và tập kháng lực đều đặn. Theo dõi tiến bộ trong nhiều tuần; tăng cân không đồng nghĩa chỉ tăng cơ.'},
  'tang-co': {label:'TĂNG CƠ',note:'Ghi lại số lần và mức tạ. Tăng độ khó từng chút khi kỹ thuật đã vững, ăn đủ và dành thời gian hồi phục giữa các buổi.'},
  'build-body': {label:'BUILD BODY',note:'Xây nền tảng với kỹ thuật vững và lịch tập phù hợp. Tập các nhóm cơ chính trong tuần và dành thời gian hồi phục.'}
};
export function dateInZone(date = new Date(), timezone='Asia/Ho_Chi_Minh') {
  return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
export function dateNumber(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s) throw Error('Ngày phải có dạng YYYY-MM-DD hợp lệ');
  return Date.parse(s+'T00:00:00Z')/86400000;
}
export function selectTopic(plan,date) {
  if (!Array.isArray(plan.topics)||!plan.topics.length) throw Error('Lộ trình cần ít nhất một chủ đề');
  const day=dateNumber(date)-dateNumber(plan.startDate);
  if(day<0) throw Error('Ngày được chọn nằm trước ngày bắt đầu lộ trình');
  return plan.topics[day%plan.topics.length];
}
export function makeVideo(topic,exercises,config) {
  if (!GOALS[topic.goal]) throw Error('Mục tiêu không hợp lệ');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(topic.id||'')) throw Error('ID chủ đề không hợp lệ');
  if (!Number.isInteger(topic.seconds)||topic.seconds<60||topic.seconds>150) throw Error('Video phải dài 60–150 giây');
  if(typeof topic.title!=='string'||!topic.title.trim()||topic.title.length>100) throw Error('Tiêu đề phải có 1–100 ký tự');
  if(typeof topic.hook!=='string'||!topic.hook.trim()) throw Error('Thiếu lời mở đầu');
  if (!Array.isArray(topic.exerciseIds)||!topic.exerciseIds.length||topic.exerciseIds.length>5) throw Error('Mỗi video cần 1–5 động tác');
  const list=topic.exerciseIds.map(id=>{if(!exercises[id]) throw Error('Không tìm thấy bài tập: '+id);return {...exercises[id],id};});
  if(topic.mode==='technique'&&list.length!==1) throw Error('Chế độ technique cần đúng một động tác');
  const scenes=[{kind:'hook',title:topic.title,narration:topic.hook,seconds:8}];
  const blocks=topic.mode==='technique'?buildCoaching(list[0],{technique:true}):list.flatMap(exercise=>buildCoaching(exercise));
  for(const b of blocks) scenes.push({kind:'exercise',...b,seconds:1});
  scenes.push({kind:'principle',title:'TIẾN BỘ CÓ KẾ HOẠCH',narration:GOALS[topic.goal].note,seconds:15});
  scenes.push({kind:'outro',title:'LƯU LẠI.\nTẬP THẬT CHẮC.',narration:'Khởi động trước khi tập. Dừng lại nếu thấy đau bất thường. Lưu video để xem lại và chia sẻ mục tiêu tập luyện của bạn.',seconds:12});
  const spare=topic.seconds-35;
  blocks.forEach((_,i)=>scenes[i+1].seconds=spare/blocks.length);
  return {topicId:topic.id,goal:GOALS[topic.goal].label,title:topic.title,brand:config.brand,tagline:config.tagline,fps:config.fps,width:config.width,height:config.height,scenes,musicVolume:config.musicVolume,demo:false};
}
export function applyTiming(video) {
  let frame=0;
  for(const scene of video.scenes) {
    scene.durationInFrames=Math.ceil(scene.seconds*video.fps);scene.from=frame;
    frame+=scene.durationInFrames;
  }
  video.durationInFrames=frame;
  if(frame<60*video.fps||frame>150*video.fps) throw Error('Lời dẫn làm video nằm ngoài 60–150 giây; rút gọn nội dung hoặc giảm số bài tập');
  return video;
}
