import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const at=(...p)=>path.join(ROOT,...p);
export async function readJson(file) {return JSON.parse(await fs.readFile(file,'utf8'));}
export async function writeJson(file,data) {await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+process.pid+'.tmp';await fs.writeFile(temp,JSON.stringify(data,null,2));await fs.rename(temp,file);}
export async function exists(file) {try{await fs.access(file);return true;}catch{return false;}}
export async function loadEnv() {
  if(!await exists(at('.env'))) return;
  for(const line of (await fs.readFile(at('.env'),'utf8')).split(/\r?\n/)) {
    const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');
  }
}
