import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../server/worker.mjs';
import {createSession,authorized,checkPassword} from '../server/auth.mjs';
import {readJson,at} from '../lib/files.mjs';
import {validateRender,validateSettings} from '../server/validation.mjs';
const env={ADMIN_PASSWORD:'test-only-admin-pass',SESSION_SECRET:'test-only-session-secret-01234567890123456789',GITHUB_TOKEN:'test-only-token-never-to-browser',ASSETS:{fetch:async()=>new Response('<html>Studio</html>',{headers:{'Content-Type':'text/html'}})}};
const config=await readJson(at('config.json')),plan=await readJson(at('content/rotation.json'));
const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const content=data=>({encoding:'base64',content:Buffer.from(JSON.stringify(data)).toString('base64'),sha:'current-sha'});
async function request(path,{method='GET',body,origin='https://studio.example.com',auth=true,token}={}) {
 const headers={...(origin?{origin}:{}),...(auth?{cookie:'sportvid_session='+(token||await createSession(env))}:{}),...(body?{'content-type':'application/json'}:{})};
 return new Request('https://studio.example.com'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
}
function githubMock(calls=[]) {
 return async(url,options={})=>{
  calls.push({url,options});
  if(url.includes('/contents/content/rotation.json'))return response(content(plan));
  if(url.includes('/contents/config.json'))return response(content(config));
  if(url.includes('/actions/variables/'))return new Response('{}',{status:404});
  if(url.includes('/runs?'))return response({workflow_runs:[]});
  if(url.endsWith('/dispatches'))return new Response(null,{status:204});
  if(url.includes('/contents/')&&options.method==='PUT')return response({commit:{sha:'new-sha'}});
  throw Error('Unexpected mock route: '+url);
 };
}
test('Sessions require a valid signature, expire, and do not accept a local bypass',async()=>{
 const token=await createSession(env,1000000);
 assert.equal(await authorized(await request('/api/state',{token}),env,1000001),true);
 assert.equal(await authorized(await request('/api/state',{token:token.slice(0,-2)+'xx'}),env,1000001),false);
 assert.equal(await authorized(await request('/api/state',{token}),env,1000000+9*60*60*1000),false);
 assert.equal(await checkPassword(env.ADMIN_PASSWORD,env.ADMIN_PASSWORD),true);
 assert.equal(await checkPassword('wrong',env.ADMIN_PASSWORD),false);
 const handle=createHandler({fetcher:()=>{throw Error('Must not call GitHub');}});
 const result=await handle(await request('/api/state',{auth:false}),{...env,DEV_LOCAL_AUTH:'1'});assert.equal(result.status,401);
});
test('Every sensitive action is blocked before any upstream call when unauthenticated or cross-origin',async()=>{
 let calls=0;const handle=createHandler({fetcher:async()=>{calls++;throw Error('No call expected');}});
 for(const path of ['/api/state','/api/runs/12/artifact','/api/runs/12/jobs'])assert.equal((await handle(await request(path,{auth:false}),env)).status,401);
 for(const path of ['/api/render','/api/logout','/api/runs/12/cancel'])assert.equal((await handle(await request(path,{method:'POST',body:{},origin:'https://attacker.example'}),env)).status,403);
 assert.equal(calls,0);
});
test('Login uses an HttpOnly, Secure, SameSite cookie and never returns credentials',async()=>{
 const handle=createHandler();
 const result=await handle(await request('/api/login',{method:'POST',body:{password:env.ADMIN_PASSWORD},auth:false}),env);
 assert.equal(result.status,200);const cookie=result.headers.get('set-cookie');
 for(const flag of ['HttpOnly','Secure','SameSite=Strict'])assert.ok(cookie.includes(flag));
 const text=await result.text();assert.ok(!text.includes(env.ADMIN_PASSWORD)&&!text.includes(env.SESSION_SECRET));
});
test('Authenticated state uses the server token without returning it, session keys or admin password',async()=>{
 const calls=[],handle=createHandler({fetcher:githubMock(calls)});const result=await handle(await request('/api/state'),env);
 assert.equal(result.status,200);const text=await result.text(),data=JSON.parse(text);
 assert.equal(data.exercises.length,5);assert.equal(data.plan.topics.length,7);assert.equal(data.runs.length,0);
 for(const secret of [env.GITHUB_TOKEN,env.SESSION_SECRET,env.ADMIN_PASSWORD])assert.ok(!text.includes(secret));
 assert.ok(calls.length>=3);assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer '+env.GITHUB_TOKEN));
});
test('Render dispatch accepts only validated inputs and blocks shell-like or unknown values',async()=>{
 const calls=[],handle=createHandler({fetcher:githubMock(calls)});
 for(const body of [{topicId:'unknown'},{seconds:'90; rm -rf /'},{voiceProvider:'unapproved'},{date:'2026-02-30'}]) {
  const r=await handle(await request('/api/render',{method:'POST',body}),env);assert.equal(r.status,400);
 }
 const result=await handle(await request('/api/render',{method:'POST',body:{topicId:plan.topics[0].id,date:'2026-11-10',seconds:90,voiceProvider:'edge',uploadDrive:'auto'}}),env);
 assert.equal(result.status,202);const dispatches=calls.filter(c=>c.url.endsWith('/dispatches'));assert.equal(dispatches.length,1);
 const payload=JSON.parse(dispatches[0].options.body);assert.equal(payload.ref,'main');assert.equal(payload.inputs.duration_seconds,'90');assert.equal(payload.inputs.topic_id,'squat-foundation');
});
test('Plan conflicts cannot overwrite newer source; secret-shaped settings are rejected',async()=>{
 const calls=[],handle=createHandler({fetcher:githubMock(calls)});
 const result=await handle(await request('/api/plan',{method:'PUT',body:{plan,sha:'stale-sha'}}),env);assert.equal(result.status,409);
 assert.ok(!calls.some(c=>c.options.method==='PUT'));
 assert.throws(()=>validateSettings({GITHUB_TOKEN:'oops'},config));
 assert.throws(()=>validateSettings({musicVolume:0.8},config));
 assert.throws(()=>validateRender({topicId:'../../fake'},plan));
});
test('Artifact proxy strips GitHub authorization before fetching a temporary download and hides the URL',async()=>{
 const calls=[];const fetcher=async(url,options={})=>{
  calls.push({url,options});
  if(url.endsWith('/artifacts')&&!url.endsWith('/zip'))return response({artifacts:[{id:55,name:'sportvid-result',expired:false}]});
  if(url.endsWith('/55/zip'))return new Response(null,{status:302,headers:{location:'https://artifact.example/result.zip?temporary-signature=hidden'}});
  if(url.startsWith('https://artifact.example/'))return new Response('zip bytes');
  throw Error('Unexpected route');
 };
 const result=await createHandler({fetcher})(await request('/api/runs/12/artifact'),env);
 assert.equal(result.status,200);assert.equal(result.headers.get('content-type'),'application/zip');
 assert.equal(result.headers.get('location'),null);assert.equal(await result.text(),'zip bytes');
 assert.equal(calls.at(-1).options.headers,undefined);
 assert.equal(calls[1].options.redirect,'manual');
});
test('Static assets receive a CSP that blocks third-party script execution and framing',async()=>{
 const result=await createHandler()(new Request('https://studio.example.com/'),env);
 assert.equal(result.status,200);const csp=result.headers.get('content-security-policy');
 assert.ok(csp.includes("script-src 'self'"));assert.ok(csp.includes("frame-ancestors 'none'"));assert.ok(!csp.includes('unsafe-inline'));
});
