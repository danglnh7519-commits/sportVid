import fs from 'node:fs/promises';
import {at,exists,writeJson} from './files.mjs';
export function parsePublicFolder(html) {
  return [...html.matchAll(/<tr data-selectable data-id="([\w-]+)"[\s\S]*?<\/tr>/g)].map(m=>{
    const raw=m[0].match(/data-tooltip="([^"]+)"/)?.[1]||'';
    const folder=/ Shared folder$| Folder$/.test(raw);
    return {id:m[1],folder,name:raw.replace(/ (Shared folder|Folder|Image|Text|Unknown|Video|Audio)$/,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"')};
  });
}
export async function listFolder(id) {
  if(!/^[\w-]+$/.test(id))throw Error('Drive folder ID không hợp lệ');
  if(process.env.GOOGLE_DRIVE_API_KEY) {
    let pageToken='',out=[];
    do {
      const q=new URLSearchParams({key:process.env.GOOGLE_DRIVE_API_KEY,q:`'${id}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType)',pageSize:'1000',...(pageToken?{pageToken}:{})});
      const r=await fetch('https://www.googleapis.com/drive/v3/files?'+q,{signal:AbortSignal.timeout(30000)});
      if(!r.ok)throw Error('Drive API trả HTTP '+r.status+'; kiểm tra key/quyền thư mục');
      const data=await r.json();out.push(...data.files.map(f=>({...f,folder:f.mimeType==='application/vnd.google-apps.folder'})));pageToken=data.nextPageToken;
    }while(pageToken);
    return out;
  }
  const r=await fetch('https://drive.google.com/drive/folders/'+id,{signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('Không đọc được Drive: HTTP '+r.status);
  const out=parsePublicFolder(await r.text());
  if(!out.length)throw Error('Drive không có tệp hiển thị công khai; kiểm tra quyền hoặc dùng Drive API');
  if(out.length>=50)console.warn('Drive HTML chỉ hiện trang đầu. Dùng folderId trực tiếp hoặc GOOGLE_DRIVE_API_KEY để đọc đủ trang.');
  return out;
}
export async function download(id,destination,image=false) {
  const r=await fetch('https://drive.google.com/uc?export=download&id='+encodeURIComponent(id),{signal:AbortSignal.timeout(60000)});
  if(!r.ok)throw Error('Không tải được tệp Drive: '+id+' HTTP '+r.status);
  const size=Number(r.headers.get('content-length')||0);
  if(size>25*1024*1024)throw Error('Tệp Drive vượt quá 25MB');
  const data=Buffer.from(await r.arrayBuffer());if(data.length>25*1024*1024)throw Error('Tệp Drive vượt quá 25MB');
  if(image&&!/^image\/(png|jpeg|gif|webp)/i.test(r.headers.get('content-type')||''))throw Error('Drive không trả về ảnh: '+id);
  if(!image&&/text\/html/.test(r.headers.get('content-type')||''))throw Error('Drive trả trang đăng nhập thay vì tài liệu nguồn');
  await fs.mkdir(at('public/media'),{recursive:true});await fs.writeFile(destination,data);
}
export async function syncDrive(exercises) {
  const manifest={updatedAt:new Date().toISOString(),exercises:{}};
  for(const [id,ex] of Object.entries(exercises)) {
    console.log('Drive:',ex.name);
    const files=await listFolder(ex.folderId);
    // Only original frame set 01–03 is selected, never treat unrelated styles as motion frames.
    let images=files.filter(f=>/^0[1-3] - .*\.(png|jpe?g|webp)$/i.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name));
    const notice=files.find(f=>f.name==='NGUON_VA_GIAY_PHEP.txt');
    const sources=files.find(f=>f.name==='sources.json');
    if(!notice||!images.length)throw Error('Thiếu hình hoặc giấy phép cho '+ex.name);
    const noticeFile=`${id}-NOTICE.txt`;await download(notice.id,at('public/media',noticeFile));
    const licenseText=await fs.readFile(at('public/media',noticeFile),'utf8');
    let author,license;
    images=images.filter(image=>{
      const start=licenseText.indexOf(image.name+'\n');
      const tail=start>=0?licenseText.slice(start):'';
      const end=tail.slice(1).search(/\n\d{2} - /);
      const block=end>=0?tail.slice(0,end+1):tail;
      const current=block.match(/^Tác giả: (.+)$/m)?.[1]?.trim();
      const currentLicense=block.match(/^Giấy phép: (.+)$/m)?.[1]?.trim();
      const supported=['Bryl Lim','Everkinetic'].includes(current)&&currentLicense==='CC BY-SA 4.0'||current?.startsWith('Free Exercise DB / yuhonas')&&currentLicense?.startsWith('Unlicense');
      if(!supported)return false;
      author??=current;license??=currentLicense;return current===author&&currentLicense===license;
    });
    if(!images.length)throw Error('Không có bộ hình có giấy phép hỗ trợ cho '+ex.name+'. Kiểm tra NOTICE.');
    if(sources)await download(sources.id,at('public/media',id+'-sources.json'));
    const paths=[];
    for(const [i,image] of images.entries()) {
      const name=`${id}-${i+1}.${image.name.split('.').pop().toLowerCase()}`;
      if(!await exists(at('public/media',name)))await download(image.id,at('public/media',name),true);
      paths.push('media/'+name);
    }
    const shortAuthor=author.startsWith('Free Exercise DB')?'Free Exercise DB / O. Jennings':author;
    manifest.exercises[id]={images:paths,selectedFiles:images.map(f=>f.name),notice:'media/'+noticeFile,source:'https://drive.google.com/drive/folders/'+ex.folderId,author,credit:shortAuthor+' • '+(license.startsWith('Unlicense')?'Unlicense':license),license};
  }
  await writeJson(at('public/media/manifest.json'),manifest);return manifest;
}
