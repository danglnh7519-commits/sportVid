import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {at,exists,loadEnv} from '../lib/files.mjs';
import worker from '../server/worker.mjs';
import {createSession,sessionCookie} from '../server/auth.mjs';
await loadEnv();
if(!await exists(at('dist/client/index.html')))throw Error('Chạy npm run web:build trước.');
const env={...process.env,ADMIN_PASSWORD:crypto.randomBytes(24).toString('hex'),SESSION_SECRET:crypto.randomBytes(48).toString('hex')};
const contentTypes={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.txt':'text/plain; charset=utf-8'};
env.ASSETS={async fetch(request){const url=new URL(request.url),name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));const target=path.resolve(at('dist/client'),name);if(!target.startsWith(at('dist/client')+path.sep)&&target!==at('dist/client/index.html'))return new Response('Not found',{status:404});try{return new Response(await fs.readFile(target),{headers:{'Content-Type':contentTypes[path.extname(target)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}};
const port=Number(process.env.PORT||4173);
const server=http.createServer(async(req,res)=>{
 try {
  const origin=`http://127.0.0.1:${port}`,url=new URL(req.url,origin);let body;
  if(req.method!=='GET'&&req.method!=='HEAD'){const chunks=[];for await(const part of req){chunks.push(part);if(chunks.reduce((n,b)=>n+b.length,0)>100000)throw Error('Request too large');}body=Buffer.concat(chunks);}
  const request=new Request(url,{method:req.method,headers:req.headers,...(body?{body}:{})});
  const response=await worker.fetch(request,env);const headers=Object.fromEntries(response.headers);
  // Local preview is loopback-only. This cookie is issued on the server; no runtime key is sent to JS.
  if(url.pathname==='/'&&!req.headers.cookie?.includes('sportvid_session='))headers['set-cookie']=sessionCookie(await createSession(env),request);
  res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'Content-Type':'text/plain'});res.end('Studio request failed');}
});
server.listen(port,'127.0.0.1',()=>console.log(`sportVid Studio — Local: http://127.0.0.1:${port}`));
