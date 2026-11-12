import fs from 'node:fs/promises';
import path from 'node:path';
const mode=process.env.DRIVE_UPLOAD_MODE||'auto';
if(!['auto','yes','no'].includes(mode))throw Error('Nơi lưu kết quả không hợp lệ.');
const required=['DRIVE_CLIENT_ID','DRIVE_CLIENT_SECRET','DRIVE_REFRESH_TOKEN','DRIVE_FOLDER_ID'];
if(mode==='no'){console.log('Không yêu cầu upload Drive.');process.exit(0);}
if(required.some(k=>!process.env[k])) {
 if(mode==='yes')throw Error('Chưa cấu hình đủ kết nối Google Drive.');
 console.log('Chưa cấu hình Drive; giữ kết quả trong bản tải về GitHub.');process.exit(0);
}
const directory=path.resolve(process.env.RENDER_DIR||'');
if(!process.env.RENDER_DIR)throw Error('Thiếu thư mục video đầu ra.');
const video=await fs.stat(path.join(directory,'video.mp4'));
if(!video.isFile()||video.size===0)throw Error('Thiếu tệp video.mp4 để lưu vào Drive.');
const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.DRIVE_CLIENT_ID,client_secret:process.env.DRIVE_CLIENT_SECRET,refresh_token:process.env.DRIVE_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(30000)});
if(!tokenResponse.ok)throw Error('Không làm mới được quyền Google Drive. Kiểm tra kết nối OAuth trong GitHub Secrets.');
const token=await tokenResponse.json();if(!token.access_token)throw Error('Google Drive không trả về quyền truy cập hợp lệ.');
const files=[['video.mp4','video/mp4'],['cover.png','image/png'],['caption.txt','text/plain'],['CREDITS.txt','text/plain'],['exercise-benefits.txt','text/plain']];
const date=path.basename(directory),run=process.env.GITHUB_RUN_ID||Date.now().toString();
const uploaded=[];
for(const [name,mimeType] of files) {
 const file=path.join(directory,name);let data;try{data=await fs.readFile(file);}catch(error){if(name==='video.mp4'||error.code!=='ENOENT')throw error;continue;}
 const filename=`${date}-${run}-${name}`;
 const metadata={name:filename,parents:[process.env.DRIVE_FOLDER_ID],appProperties:{source:'sportVid',runId:run,renderDate:date}};
 const boundary='sportvid-'+crypto.randomUUID();
 const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,JSON.stringify(metadata),`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,data,`\r\n--${boundary}--\r\n`]);
 const response=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'multipart/related; boundary='+boundary},body,signal:AbortSignal.timeout(120000)});
 if(!response.ok)throw Error(`Chưa lưu được ${name} lên Drive (HTTP ${response.status}).`);
 const result=await response.json();uploaded.push({name,id:result.id,url:result.webViewLink});console.log('Đã lưu Drive:',name);
}
await fs.writeFile(path.join(directory,'drive-upload.json'),JSON.stringify({uploadedAt:new Date().toISOString(),files:uploaded},null,2));
if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,'saved_to_drive=true\n');
