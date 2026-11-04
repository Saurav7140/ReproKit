import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureBuffer } from '../../packages/recorder/src/buffer';
import { createPublicHandler,type PublicServices } from '../functions/_shared/public-handler';

const key='11111111-1111-4111-8111-111111111111';const owner=crypto.randomUUID();const id=crypto.randomUUID();const project=crypto.randomUUID();const lease=crypto.randomUUID();
const report=new CaptureBuffer(Date.now(),crypto.randomUUID(),'website-sdk').finish('stopped');
const row=(lifecycle='pending')=>({id,project_id:project,report_id:report.id,owner_id:owner,title:report.title,platform:'web',status:'open',lifecycle,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+86400_000).toISOString(),lease_until:lifecycle==='pending'?new Date(Date.now()+900_000).toISOString():null,lease_id:lifecycle==='pending'?lease:null,storage_path:`${owner}/${id}.reprokit.json`,size_bytes:100});
function setup(overrides:Partial<PublicServices>={}){
  const calls:string[]=[];const services:PublicServices={intake:async(k,o)=>k===key&&o==='https://sample.invalid',rpc:async(name)=>{calls.push(name);return name==='begin_public_upload'?[row()]:name==='complete_upload'?[row('ready')]:null;},upload:async()=>{calls.push('storage');},...overrides};
  return {handler:createPublicHandler(services),calls};
}
function request(body:unknown=report,method='POST',origin='https://sample.invalid') {return new Request(`https://project.supabase.co/functions/v1/reprokit-public?key=${key}`,{method,headers:{Origin:origin,'Content-Type':'application/json'},...(!['GET','OPTIONS','DELETE'].includes(method)?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});}
test('public intake allows only exact enabled origin/key submissions, never private reads',async()=>{
  const {handler,calls}=setup();for(const origin of ['null','https://evil.invalid','https://sample.invalid.evil'])assert.equal((await handler(request(report,'POST',origin))).status,403);
  const missing=request();missing.headers.delete('origin');assert.equal((await handler(missing)).status,403);
  for(const method of ['GET','DELETE','PUT'])assert.equal((await handler(request(report,method))).status,405);
  assert.equal((await handler(request(report,'OPTIONS'))).status,204);assert.equal(calls.length,0);
  const response=await handler(request());assert.equal(response.status,201);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://sample.invalid');assert.deepEqual(await response.json(),{accepted:true,receipt:report.id});assert.deepEqual(calls,['charge_public_ingest','begin_public_upload','storage','complete_upload']);
  const uppercase=await handler(request({...report,id:report.id.toUpperCase()}));assert.equal(uppercase.status,201);assert.equal((await uppercase.json()).receipt,report.id.toUpperCase());
});
test('malformed/oversized/non-SDK reports are charged before parsing and never reach storage',async()=>{
  for(const body of ['{','x'.repeat(5242881),{...report,formatVersion:999},{...report,source:{platform:'web',method:'chromium-extension'}},{...report,privateUnknown:'SECRET'}]){
    const {handler,calls}=setup();const response=await handler(request(body));assert.ok([400,413].includes(response.status));assert.deepEqual(calls,['charge_public_ingest']);assert.ok(!(await response.text()).includes('SECRET'));
  }
  const {handler,calls}=setup();const input=request();input.headers.set('content-type','text/plain');assert.equal((await handler(input)).status,415);assert.deepEqual(calls,['charge_public_ingest']);
});
test('quota, duplicate, disabled-during-upload and storage failures preserve write ordering and hide provider details',async()=>{
  for(const [failure,status] of [['public_rate_limit',429],['public_report_limit',429],['intake_unavailable',403],['busy',409],['report_conflict',409]] as const){
    const {handler,calls}=setup({rpc:async()=>{throw new Error(failure);}});assert.equal((await handler(request())).status,status);assert.ok(!calls.includes('storage'));
  }
  const duplicate=setup({rpc:async(name)=>name==='begin_public_upload'?[row('ready')]:null});assert.equal((await duplicate.handler(request())).status,200);assert.ok(!duplicate.calls.includes('storage'));
  const failed=setup({upload:async()=>{throw new Error('SECRET_PROVIDER');}});const response=await failed.handler(request());assert.equal(response.status,503);assert.ok(!failed.calls.includes('complete_upload'));assert.ok(!(await response.text()).includes('SECRET_PROVIDER'));
  const wrong=setup({rpc:async(name)=>name==='begin_public_upload'?[{...row(),report_id:crypto.randomUUID()}]:null});assert.equal((await wrong.handler(request())).status,503);assert.ok(!wrong.calls.includes('storage'));
});
