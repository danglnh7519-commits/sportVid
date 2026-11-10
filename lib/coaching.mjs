const segment=(text,kind,label,extra={})=>({text,kind,label,...extra});
export function buildCoaching(exercise,{technique=false}={}) {
  const c=exercise.coaching;
  if(!c?.benefit||!c?.prepare||!c.actions?.length||!c.finish)throw Error('Thiếu lời dẫn hiệu quả/hiệu lệnh cho '+exercise.id);
  const commands=technique?[segment('Ba.','command','CHUẨN BỊ • 3',{holdSeconds:1.2}),segment('Hai.','command','CHUẨN BỊ • 2',{holdSeconds:1.2}),segment('Một. Bắt đầu!','command','BẮT ĐẦU',{holdSeconds:2})]:[segment('Bắt đầu!','command','BẮT ĐẦU',{holdSeconds:2})];
  for(let rep=1;rep<=(technique?2:1);rep++)for(const action of c.actions) {
    if(!action.text||!action.label||!(action.holdSeconds>=1&&action.holdSeconds<=15))throw Error('Hiệu lệnh không hợp lệ cho '+exercise.id);
    commands.push(segment(action.text,'command',action.label,{holdSeconds:action.holdSeconds,round:rep}));
  }
  const firstSentence=text=>text.match(/[^.!?]+[.!?]?/)?.[0]||text;
  const benefits=[segment(technique?c.benefit:firstSentence(c.benefit),'benefit','TÁC ĐỘNG & LỢI ÍCH')];
  const preparation=[segment(c.prepare,'instruction','CHUẨN BỊ')];
  const finish=[segment(technique?c.finish:firstSentence(c.finish),'encouragement','HOÀN THÀNH')];
  const block=(title,segments)=>({exercise,title,segments,narration:segments.map(s=>s.text).join(' ')});
  return technique?[
    block('TÁC ĐỘNG & LỢI ÍCH',benefits),
    block('CHUẨN BỊ ĐÚNG TƯ THẾ',preparation),
    block('CÙNG TẬP CÓ KIỂM SOÁT',[...commands,...finish])
  ]:[block(exercise.vi,[...benefits,...preparation,...commands,...finish])];
}
