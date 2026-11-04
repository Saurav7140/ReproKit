import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { spawn,type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium,expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { hostedConfiguration,parseReport } from '../../packages/core/src/report';

// Explicit opt-in live acceptance. Admin credentials are read from an ignored server-only file.
const config=hostedConfiguration(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
assert(config&&process.env.REPROKIT_TEST_SECRET_KEY&&config.url===`https://${process.env.REPROKIT_TEST_PROJECT_REF}.supabase.co`,'Configure dedicated-project live test settings.');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(30_000)})}};
const admin=createClient(config.url,process.env.REPROKIT_TEST_SECRET_KEY,options);const client=createClient(config.url,config.key,options);
function data<T extends {data:unknown;error:unknown}>(result:T):NonNullable<T['data']>{assert(!result.error,'Live provider operation failed');return result.data as NonNullable<T['data']>;}
let owner='';const servers:ChildProcess[]=[];let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;let gate='setup';
async function server(app:string,args:string[],env:Record<string,string>={}){
  const child=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),...args,'--host','127.0.0.1','--strictPort'],{cwd:resolve(app),env:{...process.env,...env},stdio:'ignore',windowsHide:true});servers.push(child);
  const port=args[args.indexOf('--port')+1];for(let i=0;i<120;i++){if(child.exitCode!==null)throw new Error('live_server_failed');try{if((await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(500)})).ok)return;}catch{}await new Promise((done)=>setTimeout(done,250));}throw new Error('live_server_timeout');
}
try{
  const email=`reprokit-sdk-test-${randomUUID()}@example.invalid`;const password=randomBytes(24).toString('base64url');
  owner=data(await admin.auth.admin.createUser({email,password,email_confirm:true})).user!.id;
  data(await client.auth.signInWithPassword({email,password}));const created=data(await client.rpc('create_project',{p_name:'Synthetic SDK live acceptance'}));const project=(Array.isArray(created)?created[0]:created).id;
  const intake=data(await client.rpc('configure_website_intake',{p_project:project,p_origin:'http://127.0.0.1:5176',p_enabled:true,p_rotate:false}));const key=(Array.isArray(intake)?intake[0]:intake).public_key;
  const endpoint=`${config.url}/functions/v1/reprokit-public`;
  await server('apps/sdk-demo',['--port','5176'],{VITE_REPROKIT_PUBLIC_ENDPOINT:endpoint,VITE_REPROKIT_PROJECT_KEY:key});await server('apps/dashboard',['preview','--port','5173']);
  browser=await chromium.launch({channel:'chromium',headless:true});const context=await browser.newContext();const page=await context.newPage();
  gate='consented SDK capture';console.log('Checking:',gate);await page.goto('http://127.0.0.1:5176/');await page.getByRole('button',{name:'Report a problem',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByTestId('submit-order').click();await page.getByTestId('throw-error').click();const failed=page.waitForResponse((response)=>response.url().endsWith('/api/fail-fetch'));await page.getByTestId('fail-fetch').click();await failed;await page.getByRole('button',{name:'Stop and review',exact:true}).click();
  await page.getByLabel('Report title',{exact:true}).fill('Synthetic SDK live acceptance report');await page.getByRole('button',{name:'Save details',exact:true}).click();
  gate='real unauthenticated public POST and private object';console.log('Checking:',gate);const submitted=page.waitForResponse((response)=>response.url().startsWith(endpoint)&&response.request().method()==='POST');await page.getByRole('button',{name:'Submit report',exact:true}).click();const response=await submitted;assert.equal(response.status(),201);assert.equal(response.request().headers().authorization,undefined);await expect(page.getByRole('button',{name:'Submitted',exact:true})).toBeDisabled();
  const payload=response.request().postData()!;const report=parseReport(payload);assert(!/SYNTHETIC_SDK_|PRIVATE_|MUTATED_/.test(payload));assert.equal(report.source.method,'website-sdk');
  const saved=data(await admin.from('reports').select('*').eq('owner_id',owner).eq('report_id',report.id).single());assert.equal(saved.lifecycle,'ready');const object=data(await admin.storage.from('recordings').download(saved.storage_path));assert.equal(parseReport(await object.text()).id,report.id);
  gate='public denial, duplicate, rotation and atomic quota';console.log('Checking:',gate);
  const call=(body=payload,origin='http://127.0.0.1:5176',method='POST',publicKey=key)=>fetch(`${endpoint}?key=${publicKey}`,{method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='POST'?{body}:{}),signal:AbortSignal.timeout(30_000)});
  assert.equal((await call()).status,200);assert.equal(data(await admin.from('reports').select('id').eq('owner_id',owner)).length,1);
  assert.equal((await call(payload,'https://other.invalid')).status,403);assert.equal((await call(payload,'null')).status,403);assert.equal((await call(payload,'http://127.0.0.1:5176','GET')).status,405);assert.equal((await call('{')).status,400);
  const anonymous=createClient(config.url,config.key,options);assert((await anonymous.from('website_intakes').select('*')).error);assert((await anonymous.storage.from('recordings').download(saved.storage_path)).error);
  const publicRead=await fetch(`${config.url}/functions/v1/reprokit?op=read&id=${saved.id}`);assert.equal(publicRead.status,401);
  const rotated=data(await client.rpc('configure_website_intake',{p_project:project,p_origin:'http://127.0.0.1:5176',p_enabled:true,p_rotate:true}));const newKey=(Array.isArray(rotated)?rotated[0]:rotated).public_key;assert.notEqual(newKey,key);assert.equal((await call()).status,403);
  const statuses=await Promise.all(Array.from({length:9},async()=> (await call('{','http://127.0.0.1:5176','POST',newKey)).status));assert.equal(statuses.filter((status)=>status===400).length,7);assert.equal(statuses.filter((status)=>status===429).length,2);
  gate='owner dashboard opens real submitted report and replay';console.log('Checking:',gate);const dashboard=await context.newPage();await dashboard.goto(`http://127.0.0.1:5173/?view=hosted&project=${project}&report=${saved.id}`);await dashboard.getByLabel('Email',{exact:true}).fill(email);await dashboard.getByLabel('Password',{exact:true}).fill(password);await dashboard.getByRole('button',{name:'Sign in',exact:true}).click();await expect(dashboard.locator('.hosted-open').getByRole('heading',{name:report.title,exact:true})).toBeVisible({timeout:20_000});await dashboard.locator('.hosted-open').getByRole('button',{name:'Replay',exact:true}).click();await expect(dashboard.getByText('Replay paused',{exact:true})).toBeVisible();
  await dashboard.screenshot({path:'docs/screenshots/phase7-live-private-replay.png',fullPage:true});
  data(await client.rpc('configure_website_intake',{p_project:project,p_origin:'http://127.0.0.1:5176',p_enabled:false,p_rotate:false}));assert.equal((await call(payload,'http://127.0.0.1:5176','POST',newKey)).status,403);
  console.log('Live SDK capture -> separate public intake -> private Storage -> authenticated dashboard/replay passed. Atomic quota, rotation, anonymous denial and duplicate checks passed.');
}catch{console.error('Failed live SDK gate:',gate);process.exitCode=1;}
finally{
  await browser?.close();for(const child of servers)child.kill();
  if(owner)try{const rows=data(await admin.from('reports').select('id,storage_path').eq('owner_id',owner));for(const row of rows){data(await admin.storage.from('recordings').remove([row.storage_path]));data(await admin.from('reports').delete().eq('owner_id',owner).eq('id',row.id));}data(await admin.from('projects').delete().eq('owner_id',owner));data(await admin.auth.admin.deleteUser(owner));console.log('Temporary SDK test account, intake, counters, reports and objects removed.');}catch{console.error('SDK test cleanup needs attention.');process.exitCode=1;}
}
