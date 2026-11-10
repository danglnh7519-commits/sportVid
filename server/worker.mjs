import initialPlan from '../content/rotation.json' with {type:'json'};
import initialConfig from '../config.json' with {type:'json'};
import catalog from '../content/exercises.json' with {type:'json'};
import coaching from '../content/coaching.json' with {type:'json'};
import {authorized,allowLogin,checkPassword,createSession,sessionCookie,trustedOrigin} from './auth.mjs';
import {validatePlan,validateRender,validateSettings} from './validation.mjs';
const exercises=Object.fromEntries(Object.entries(catalog).map(([id,e])=>[id,{...e,coaching:coaching[id]}]));
const safeHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{...safeHeaders,'Content-Type':'application/json; charset=utf-8',...headers}});
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
const encode=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
const encodeText=s=>encode(new TextEncoder().encode(s));
async function readBody(request) {
  if(!request.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'Dữ liệu cần ở định dạng JSON.');
  const text=await request.text();if(text.length>100000)throw new HttpError(413,'Dữ liệu quá lớn.');
  try{return JSON.parse(text);}catch{throw new HttpError(400,'Dữ liệu không hợp lệ.');}
}
export function createHandler({fetcher=fetch}={}) {
 return async function handle(request,env) {
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith('/api/')) {
    const asset=await env.ASSETS.fetch(request);const response=new Response(asset.body,asset);
    response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','same-origin');
    response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    return response;
  }
  if(path==='/api/health')return json({ok:true});
  const connected=Boolean(env.ADMIN_PASSWORD&&env.SESSION_SECRET&&env.SESSION_SECRET.length>=32);
  if(path==='/api/session'&&request.method==='GET')return json({authenticated:await authorized(request,env),configured:connected});
  try {
    if(!connected)throw new HttpError(503,'Giao diện chưa được cấu hình đăng nhập trên máy chủ.');
    if(['POST','PUT','PATCH','DELETE'].includes(request.method)&&!trustedOrigin(request))throw new HttpError(403,'Yêu cầu không cùng nguồn.');
    if(path==='/api/login'&&request.method==='POST') {
      if(!allowLogin(request))throw new HttpError(429,'Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.');
      const body=await readBody(request);if(!await checkPassword(body.password,env.ADMIN_PASSWORD))throw new HttpError(401,'Mật khẩu chưa đúng.');
      return json({ok:true},200,{'Set-Cookie':sessionCookie(await createSession(env),request)});
    }
    if(!await authorized(request,env))throw new HttpError(401,'Vui lòng đăng nhập để tiếp tục.');
    if(path==='/api/logout'&&request.method==='POST')return json({ok:true},200,{'Set-Cookie':sessionCookie('',request,0)});
    const owner=env.GITHUB_OWNER||'danglnh7519-commits',repo=env.GITHUB_REPO||'sportVid',branch=env.GITHUB_BRANCH||'main';
    if(!/^[\w.-]+$/.test(owner)||!/^[\w.-]+$/.test(repo))throw new HttpError(503,'Cấu hình kho mã nguồn không hợp lệ.');
    const repoPath=`/repos/${owner}/${repo}`;
    async function github(endpoint,{method='GET',body,raw=false,allow404=false,redirect='follow'}={}) {
      if(!env.GITHUB_TOKEN)throw new HttpError(503,'Chưa kết nối GitHub ở phía máy chủ.');
      const response=await fetcher('https://api.github.com'+repoPath+endpoint,{method,redirect,headers:{Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'sportVid-dashboard',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      if(response.status===404&&allow404)return null;
      if(!response.ok&&response.status!==302)throw new HttpError(response.status===403?403:502,response.status===403?'Kết nối GitHub chưa đủ quyền cho thao tác này.':'GitHub chưa xử lý được yêu cầu. Hãy thử lại sau.');
      if(raw)return response;if(response.status===204)return null;return response.json();
    }
    async function file(name,fallback) {
      if(!env.GITHUB_TOKEN)return {data:fallback,sha:null};
      const value=await github('/contents/'+name+'?ref='+encodeURIComponent(branch),{allow404:true});
      if(!value)return {data:fallback,sha:null};
      if(value.encoding!=='base64')throw new HttpError(502,'Không đọc được cấu hình GitHub.');
      return {data:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.content.replaceAll('\n','')),c=>c.charCodeAt(0)))),sha:value.sha};
    }
    async function saveFile(name,data,sha,message) {
      return github('/contents/'+name,{method:'PUT',body:{message,content:encodeText(JSON.stringify(data,null,2)+'\n'),branch,...(sha?{sha}:{})}});
    }
    if(path==='/api/state'&&request.method==='GET') {
      const [plan,config]=await Promise.all([file('content/rotation.json',initialPlan),file('config.json',initialConfig)]);
      let runs=[],notice=null;
      if(env.GITHUB_TOKEN)try {const data=await github('/actions/workflows/render.yml/runs?per_page=20',{allow404:true});runs=data?.workflow_runs||[];if(!data)notice='Chưa có workflow tạo video trên nhánh chính.';}catch(error){notice=error.message;}
      else notice='Chưa kết nối GitHub. Bạn vẫn có thể xem chủ đề và soạn lộ trình.';
      let dailyEnabled=null;
      if(env.GITHUB_TOKEN)try {const value=await github('/actions/variables/DAILY_RENDER_ENABLED',{allow404:true});dailyEnabled=value?.value!=='false';}catch{}
      return json({repository:{owner,repo,branch,url:`https://github.com/${owner}/${repo}`},plan:plan.data,planSha:plan.sha,settings:{brand:config.data.brand,tagline:config.data.tagline,voiceProvider:config.data.voiceProvider,voiceRate:config.data.voiceRate,voicePitch:config.data.voicePitch,musicVolume:config.data.musicVolume},settingsSha:config.sha,exercises:Object.entries(exercises).map(([id,e])=>({id,name:e.vi,muscles:e.muscles,dose:e.dose,cue:e.cue,benefit:e.coaching.benefit})),runs:runs.map(r=>({id:r.id,title:r.display_title,status:r.status,conclusion:r.conclusion,createdAt:r.created_at,url:r.html_url,event:r.event})),connections:{github:Boolean(env.GITHUB_TOKEN),drive:env.DRIVE_UPLOAD_ENABLED==='true'?'configured':'unknown'},schedule:{enabled:dailyEnabled,time:'12:00',timezone:'Asia/Ho_Chi_Minh'},notice});
    }
    if(path==='/api/plan'&&request.method==='PUT') {
      const body=await readBody(request);let plan;try{plan=validatePlan(body.plan,exercises,initialConfig);}catch(error){throw new HttpError(400,error.message);}
      const current=await file('content/rotation.json',initialPlan);if((body.sha||null)!==current.sha)throw new HttpError(409,'Lộ trình đã thay đổi ở nơi khác. Hãy tải lại trước khi lưu.');
      await saveFile('content/rotation.json',plan,current.sha,'Update workout video plan from dashboard');return json({ok:true});
    }
    if(path==='/api/settings'&&request.method==='PUT') {
      const body=await readBody(request),current=await file('config.json',initialConfig);
      if((body.sha||null)!==current.sha)throw new HttpError(409,'Cài đặt đã thay đổi ở nơi khác. Hãy tải lại.');
      let data;try{data=validateSettings(body.settings,current.data);}catch(error){throw new HttpError(400,error.message);}
      await saveFile('config.json',data,current.sha,'Update video style and voice settings from dashboard');return json({ok:true});
    }
    if(path==='/api/render'&&request.method==='POST') {
      const body=await readBody(request),plan=await file('content/rotation.json',initialPlan);let inputs;
      try {inputs=validateRender(body,plan.data);}catch(error){throw new HttpError(400,error.message);}
      const active=await github('/actions/workflows/render.yml/runs?per_page=10',{allow404:true});
      if(active?.workflow_runs?.some(r=>['queued','in_progress','waiting','requested','pending'].includes(r.status)))throw new HttpError(409,'Đang có một video được xử lý. Chờ hoàn tất hoặc hủy tác vụ trước.');
      await github('/actions/workflows/render.yml/dispatches',{method:'POST',body:{ref:branch,inputs}});return json({ok:true,message:'Đã gửi yêu cầu tạo video. Tác vụ sẽ xuất hiện trong giây lát.'},202);
    }
    if(path==='/api/schedule'&&request.method==='PUT') {
      const body=await readBody(request);if(typeof body.enabled!=='boolean')throw new HttpError(400,'Trạng thái lịch không hợp lệ.');
      const current=await github('/actions/variables/DAILY_RENDER_ENABLED',{allow404:true});
      await github(current?'/actions/variables/DAILY_RENDER_ENABLED':'/actions/variables',{method:current?'PATCH':'POST',body:{name:'DAILY_RENDER_ENABLED',value:String(body.enabled)}});return json({ok:true});
    }
    const cancel=path.match(/^\/api\/runs\/(\d+)\/cancel$/);
    if(cancel&&request.method==='POST') {await github('/actions/runs/'+cancel[1]+'/cancel',{method:'POST'});return json({ok:true});}
    const jobs=path.match(/^\/api\/runs\/(\d+)\/jobs$/);
    if(jobs&&request.method==='GET') {const data=await github('/actions/runs/'+jobs[1]+'/jobs');return json({jobs:data.jobs.map(j=>({id:j.id,name:j.name,status:j.status,conclusion:j.conclusion,steps:j.steps?.map(s=>({name:s.name,status:s.status,conclusion:s.conclusion}))}))});}
    const artifact=path.match(/^\/api\/runs\/(\d+)\/artifact$/);
    if(artifact&&request.method==='GET') {
      const data=await github('/actions/runs/'+artifact[1]+'/artifacts');const item=data.artifacts.find(a=>!a.expired&&a.name.startsWith('sportvid-'));
      if(!item)throw new HttpError(404,'Video chưa sẵn sàng hoặc bản lưu tạm đã hết hạn.');
      const result=await github('/actions/artifacts/'+item.id+'/zip',{raw:true,redirect:'manual'});
      const location=result.headers.get('location');
      if(!location)throw new HttpError(502,'Chưa tải được kết quả video.');
      const remote=new URL(location);if(remote.protocol!=='https:')throw new HttpError(502,'Địa chỉ kết quả không hợp lệ.');
      // GitHub authorization is never forwarded to the temporary artifact host or browser.
      const downloaded=await fetcher(location);if(!downloaded.ok)throw new HttpError(502,'Chưa tải được kết quả video.');
      return new Response(downloaded.body,{headers:{...safeHeaders,'Content-Type':'application/zip','Content-Disposition':`attachment; filename="sportvid-${artifact[1]}.zip"`}});
    }
    throw new HttpError(404,'Không tìm thấy chức năng này.');
  }catch(error){return json({error:error instanceof HttpError?error.message:'Chưa xử lý được yêu cầu. Vui lòng thử lại.'},error instanceof HttpError?error.status:500);}
 };
}
export default {fetch:createHandler()};
