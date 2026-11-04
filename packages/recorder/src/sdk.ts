import { z } from 'zod';
import { parseReport, prepareReportExport, type Report } from '@reprokit/core';
import { sanitizeUrl } from '@reprokit/core/privacy';
import { CaptureBuffer } from './buffer';
import { startWebRecording } from './record';
import { startDiagnostics } from './diagnostics';
import type { CapturePacket, EndReason } from './protocol';

export type WebsiteCaptureState={status:'idle'|'recording'|'stopped';report:Report|null;events:number;bytes:number;reason:EndReason|null};
let current:symbol|null=null;

export function createWebsiteRecorder(){
  const identity=Symbol();const listeners=new Set<()=>void>();
  let state:WebsiteCaptureState={status:'idle',report:null,events:0,bytes:0,reason:null};
  let buffer:CaptureBuffer|null=null;let stopDom:(()=>void)|undefined;let stopDiagnostics:(()=>void)|undefined;let ticker:ReturnType<typeof setInterval>|undefined;let finishing=false;
  const publish=(next:WebsiteCaptureState)=>{state=next;listeners.forEach((listener)=>listener());};
  function finish(reason:EndReason){
    if(finishing)return state.report;
    if(!buffer){if(reason==='discarded')publish({status:'idle',report:null,events:0,bytes:0,reason});return state.report;}
    finishing=true;
    try{
      stopDom?.();stopDiagnostics?.();clearInterval(ticker);stopDom=undefined;stopDiagnostics=undefined;
      const completed=reason==='discarded'?null:buffer.finish(reason);const events=buffer.eventCount;const bytes=buffer.byteSize;
      buffer=null;if(current===identity)current=null;
      publish({status:completed?'stopped':'idle',report:completed,events:completed?events:0,bytes:completed?bytes:0,reason});
      return completed;
    }finally{finishing=false;}
  }
  const emit=(packet:CapturePacket)=>{if(state.status!=='recording'||!buffer)return;const end=buffer.append(packet);if(end&&!finishing)finish(end);};
  return {
    snapshot:()=>state,
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    start(options:{consent:boolean}){
      if(options?.consent!==true)throw new Error('Obtain explicit consent before starting.');
      if(state.status!=='idle')throw new Error('Discard/export the existing recording before starting again.');
      if(typeof window==='undefined'||window!==window.top||document.contentType!=='text/html'||!['http:','https:'].includes(location.protocol)||!crypto.randomUUID)throw new Error('Website capture needs a supported top-level secure HTML page.');
      if(current||document.querySelector('[data-reprokit-recording]'))throw new Error('Another recording is already active.');
      current=identity;buffer=new CaptureBuffer(Date.now(),crypto.randomUUID(),'website-sdk');
      const ua=navigator.userAgent;const chromium=/(?:Chrome|Chromium)\/(\d+)/.exec(ua);const firefox=/Firefox\/(\d+)/.exec(ua);const webkit=/Version\/(\d+)/.exec(ua);
      buffer.report.environment={os:ua.includes('Windows')?'Windows':ua.includes('Android')?'Android':/iPhone|iPad/.test(ua)?'iOS':ua.includes('Mac OS')?'macOS':ua.includes('Linux')?'Linux':'unknown',browser:{family:chromium?'Chromium':firefox?'Firefox':webkit?'WebKit':'unknown',majorVersion:Math.min(999,Number((chromium??firefox??webkit)?.[1]??1))},viewport:{width:Math.max(1,Math.min(16_384,innerWidth)),height:Math.max(1,Math.min(16_384,innerHeight))}};
      if(buffer.report.evidence.kind==='web')buffer.report.evidence.page={url:sanitizeUrl(location.href)};
      if(!('responseStatus' in PerformanceResourceTiming.prototype))buffer.report.capabilities.requests='unsupported';
      publish({status:'recording',report:null,events:0,bytes:0,reason:null});
      try{
        stopDiagnostics=startDiagnostics(emit,buffer.startedAt);
        stopDom=startWebRecording({sessionId:crypto.randomUUID(),startedAt:buffer.startedAt,emit,end:finish});
        if(current!==identity){stopDom?.();stopDiagnostics?.();return;}
        ticker=setInterval(()=>{if(buffer)publish({...state,events:buffer.eventCount,bytes:buffer.byteSize});},500);
      }catch{finish('capture-error');throw new Error('Website capture could not start safely.');}
    },
    stop:()=>finish('stopped'),
    discard:()=>{finish('discarded');},
    dispose:()=>{finish('discarded');listeners.clear();},
  };
}

export function websiteEndpoint(endpoint:string,key:string):string{
  let url:URL;try{url=new URL(endpoint);}catch{throw new Error('Configure a valid public ingestion endpoint.');}
  if(url.username||url.password||url.search||url.hash||url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))throw new Error('Use HTTPS public ingestion, or HTTP on loopback.');
  url.searchParams.set('key',z.uuid().parse(key));return url.href;
}

export async function submitWebsiteReport(report:Report,options:{endpoint:string;projectKey:string}){
  const validated=parseReport(prepareReportExport(report).text);
  if(validated.formatVersion!==4||validated.source.platform!=='web'||validated.source.method!=='website-sdk')throw new Error('Public intake accepts current website SDK reports only.');
  const url=websiteEndpoint(options.endpoint,options.projectKey);
  let response:Response;try{response=await fetch(url,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(validated),signal:AbortSignal.timeout(30_000)});}catch{throw new Error('Submission failed or timed out. Your local report is unchanged; retry or export it.');}
  const body=await response.json().catch(()=>null) as {accepted?:boolean;receipt?:string;error?:string}|null;
  if(!response.ok||body?.accepted!==true||body.receipt!==report.id)throw new Error(typeof body?.error==='string'?body.error:'Submission did not finish. Your local report is unchanged.');
  return {accepted:true as const,receipt:body.receipt};
}
