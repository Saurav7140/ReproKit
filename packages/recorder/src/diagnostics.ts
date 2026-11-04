import { sanitizeUrl } from '@reprokit/core/privacy';
import type { CapturePacket } from './protocol';

export function startDiagnostics(emitPacket: (packet: CapturePacket) => void, startedAt: number, ignoreUrl: (url: string) => boolean = () => false) {
  let active=true;let count=0;let second=0;let burst=0;const startedPerformance=performance.now();
  const atMs=()=>Math.max(0,Math.min(300_000,Date.now()-startedAt));
  const emit=(packet:CapturePacket)=>{const now=Math.floor(performance.now()/1000);if(now!==second){second=now;burst=0;}if(active&&++burst<=50&&++count<=2_000)emitPacket(packet);};
  const error=(event:ErrorEvent)=>{
    if(event.target!==window)return;
    const line=Number.isInteger(event.lineno)&&event.lineno>=0?Math.min(event.lineno,1_000_000):0;
    const column=Number.isInteger(event.colno)&&event.colno>=0?Math.min(event.colno,1_000_000):0;
    emit({kind:'error',event:{atMs:atMs(),type:'exception',message:'JavaScript exception (message masked)',stack:`at [masked]:${line}:${column}`}});
  };
  const rejection=()=>emit({kind:'error',event:{atMs:atMs(),type:'unhandled-rejection',message:'Unhandled promise rejection (reason masked)'}});
  const observer=new PerformanceObserver((entries)=>{
    for(const entry of entries.getEntries() as PerformanceResourceTiming[]){
      if(entry.startTime<startedPerformance||!['fetch','xmlhttprequest'].includes(entry.initiatorType)||ignoreUrl(entry.name)||!Number.isInteger(entry.responseStatus)||entry.responseStatus<400||entry.responseStatus>599)continue;
      emit({kind:'request',event:{atMs:atMs(),transport:entry.initiatorType==='fetch'?'fetch':'xhr',method:'OTHER',url:sanitizeUrl(entry.name),status:entry.responseStatus,outcome:'http-error'}});
    }
  });
  const stop=()=>{active=false;observer.disconnect();clearTimeout(timer);window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',rejection);window.removeEventListener('pagehide',stop);};
  const timer=window.setTimeout(stop,300_000);
  window.addEventListener('error',error);window.addEventListener('unhandledrejection',rejection);window.addEventListener('pagehide',stop,{once:true});
  try{observer.observe({type:'resource',buffered:false});}catch{stop();throw new Error('Resource diagnostics unavailable');}
  return stop;
}
