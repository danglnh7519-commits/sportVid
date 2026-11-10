const encoder=new TextEncoder();
const attempts=new Map();
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function hmacKey(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function checkPassword(value,expected) {
  if(!expected||typeof value!=='string'||value.length>1024)return false;
  const [a,b]=await Promise.all([value,expected].map(v=>crypto.subtle.digest('SHA-256',encoder.encode(v))));
  const left=new Uint8Array(a),right=new Uint8Array(b);let difference=0;for(let i=0;i<left.length;i++)difference|=left[i]^right[i];return difference===0;
}
export async function createSession(env,now=Date.now()) {
  if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32)throw Error('Chưa thiết lập bảo vệ phiên đăng nhập.');
  const body=b64(encoder.encode(JSON.stringify({exp:Math.floor(now/1000)+8*60*60,nonce:crypto.randomUUID()})));
  const signature=await crypto.subtle.sign('HMAC',await hmacKey(env.SESSION_SECRET),encoder.encode(body));
  return body+'.'+b64(signature);
}
export async function authorized(request,env,now=Date.now()) {
  const cookie=request.headers.get('cookie')||'';const token=cookie.match(/(?:^|;\s*)sportvid_session=([^;]+)/)?.[1];
  if(!token||!env.SESSION_SECRET)return false;
  try {
    const [body,signature,...rest]=token.split('.');if(rest.length||!body||!signature)return false;
    const valid=await crypto.subtle.verify('HMAC',await hmacKey(env.SESSION_SECRET),unb64(signature),encoder.encode(body));
    if(!valid)return false;const data=JSON.parse(new TextDecoder().decode(unb64(body)));return Number.isFinite(data.exp)&&data.exp>now/1000;
  }catch{return false;}
}
export function sessionCookie(token,request,maxAge=28800) {
  return `sportvid_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export function allowLogin(request,now=Date.now()) {
  const key=request.headers.get('cf-connecting-ip')||'local';let entry=attempts.get(key);
  if(!entry||now>entry.until)entry={count:0,until:now+15*60*1000};entry.count++;attempts.set(key,entry);
  if(attempts.size>1000)attempts.delete(attempts.keys().next().value);
  return entry.count<=10;
}
export function trustedOrigin(request) {return request.headers.get('origin')===new URL(request.url).origin;}
