import {spawn} from 'node:child_process';
import {at} from '../lib/files.mjs';
const names=['STUDIO_GITHUB_TOKEN','STUDIO_ADMIN_PASSWORD','STUDIO_SESSION_SECRET'];
if(names.some(k=>!process.env[k]))throw Error('Chưa cấu hình đủ kết nối và đăng nhập Studio trong GitHub Secrets.');
if(process.env.STUDIO_SESSION_SECRET.length<32)throw Error('Khóa phiên đăng nhập cần ít nhất 32 ký tự.');
const secretValues={GITHUB_TOKEN:process.env.STUDIO_GITHUB_TOKEN,ADMIN_PASSWORD:process.env.STUDIO_ADMIN_PASSWORD,SESSION_SECRET:process.env.STUDIO_SESSION_SECRET};
if(process.env.DRIVE_UPLOAD_ENABLED)secretValues.DRIVE_UPLOAD_ENABLED=process.env.DRIVE_UPLOAD_ENABLED;
async function wrangler(args,input) {
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[at('node_modules/wrangler/bin/wrangler.js'),...args],{env:process.env,stdio:['pipe','inherit','inherit'],windowsHide:true});
  child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Triển khai Studio chưa hoàn tất.')));child.stdin.end(input||'');
 });
}
await wrangler(['deploy']);
// Values stay in process memory/stdin. Never use shell arguments, source files or build-time JS.
await wrangler(['secret','bulk'],JSON.stringify(secretValues));
console.log('Studio deployed with server-side secrets.');
