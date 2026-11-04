import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebsiteRecorder,websiteEndpoint,submitWebsiteReport } from './sdk';
import { CaptureBuffer } from './buffer';
test('SDK construction is idle without a browser, requires consent, and discard removes the report',()=>{
  const recorder=createWebsiteRecorder();assert.equal(recorder.snapshot().status,'idle');assert.equal(recorder.snapshot().report,null);
  assert.throws(()=>recorder.start({consent:false}),/consent/);assert.throws(()=>recorder.start({consent:true}),/supported/);recorder.discard();assert.equal(recorder.snapshot().report,null);recorder.dispose();
});
test('public endpoint permits HTTPS or loopback only, rejects credentials/query and malformed public keys',()=>{
  const key=crypto.randomUUID();assert.equal(new URL(websiteEndpoint('https://sample.invalid/ingest',key)).searchParams.get('key'),key);
  assert.ok(websiteEndpoint('http://127.0.0.1:5176/ingest',key));
  for(const endpoint of ['http://sample.invalid/ingest','https://user:secret@sample.invalid','https://sample.invalid/?key=old','https://sample.invalid/#part'])assert.throws(()=>websiteEndpoint(endpoint,key));
  assert.throws(()=>websiteEndpoint('https://sample.invalid','not-a-key'));
});
test('SDK submission is explicit and validates the report; a failure preserves the original report',async()=>{
  const report=new CaptureBuffer(Date.now(),crypto.randomUUID(),'website-sdk').finish('stopped');assert.equal(report.source.method,'website-sdk');
  const original=JSON.stringify(report);const previous=globalThis.fetch;const calls:RequestInit[]=[];
  try{
    globalThis.fetch=async(_input,init)=>{calls.push(init!);return Response.json({accepted:true,receipt:report.id});};
    assert.equal((await submitWebsiteReport(report,{endpoint:'https://sample.invalid/ingest',projectKey:crypto.randomUUID()})).accepted,true);assert.equal(calls[0]!.credentials,'omit');assert.equal((calls[0]!.headers as Record<string,string>).Authorization,undefined);
    globalThis.fetch=async()=>{throw new Error('network');};await assert.rejects(submitWebsiteReport(report,{endpoint:'https://sample.invalid/ingest',projectKey:crypto.randomUUID()}),/unchanged/);assert.equal(JSON.stringify(report),original);
    await assert.rejects(submitWebsiteReport({...report,source:{platform:'web',method:'chromium-extension'}},{endpoint:'https://sample.invalid/ingest',projectKey:crypto.randomUUID()}),/SDK/);
  }finally{globalThis.fetch=previous;}
});
