import { useState,useSyncExternalStore,type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { createWebsiteRecorder,submitWebsiteReport } from '@reprokit/recorder';
import { ReportViewer } from '../../shared/ReportViewer';
import { Confirm } from '../../shared/Confirm';
import { Mark } from '../../shared/Mark';
import type { Report } from '@reprokit/core';
import '../../shared/style.css';
import './style.css';

// Host-owned instance and trigger: importing/constructing does not start capture.
const recorder=createWebsiteRecorder();
const endpoint=import.meta.env.VITE_REPROKIT_PUBLIC_ENDPOINT as string|undefined;
const projectKey=import.meta.env.VITE_REPROKIT_PROJECT_KEY as string|undefined;
function App(){
  const capture=useSyncExternalStore(recorder.subscribe,recorder.snapshot);
  const [open,setOpen]=useState(false);const [consent,setConsent]=useState(false);const [report,setReport]=useState<Report|null>(null);
  const [dirty,setDirty]=useState(false);const [busy,setBusy]=useState(false);const [submitted,setSubmitted]=useState(false);const [message,setMessage]=useState('');const [discarding,setDiscarding]=useState(false);
  const [attempts,setAttempts]=useState(0);const [demoStatus,setDemoStatus]=useState('No order has been saved.');
  const currentReport=report??capture.report;
  function start(){try{setMessage('');setReport(null);recorder.start({consent});setOpen(false);setConsent(false);}catch(error){setMessage(error instanceof Error?error.message:'Capture could not start.');}}
  function discard(){recorder.discard();setReport(null);setDirty(false);setSubmitted(false);setOpen(false);setConsent(false);setDiscarding(false);setMessage('Recording discarded from this page. Previously submitted/downloaded copies are unchanged.');}
  async function submit(){
    if(!currentReport||!endpoint||!projectKey||busy||submitted||dirty)return;
    setBusy(true);setMessage('Submitting the reviewed report…');
    try{await submitWebsiteReport(currentReport,{endpoint,projectKey});setSubmitted(true);setMessage('Report submitted privately to the project owner. Your local copy is still available.');}
    catch(error){setMessage(error instanceof Error?error.message:'Submission failed. Retry or export your local copy.');}
    finally{setBusy(false);}
  }
  function brokenSubmit(event:FormEvent){event.preventDefault();setAttempts((value)=>value+1);setDemoStatus('Submit finished, but the order is still unsaved.');}
  return <div className="standalone sdk-sample"><a className="skip-link" href="#main">Skip to sample</a><header><span className="brand"><Mark/>ReproKit <span className="muted">/ Website SDK sample</span></span><a href="http://127.0.0.1:5173/?view=hosted">Private workspace ↗</a></header>
    <main id="main" className="demo-main"><div className="section-heading"><div><h1>Report from a website</h1><p>This separate sample uses @reprokit/recorder. No extension is needed.</p></div><div data-reprokit-ui=""><button className="button primary" disabled={capture.status!=='idle'||open} onClick={()=>{setMessage('');setOpen(true);}}>Report a problem</button></div></div>
      <section className="sdk-controls" data-reprokit-ui="" aria-label="Website recording controls">
        {capture.status==='idle'&&!open&&<p>Nothing is recording. Use Report a problem to review consent first.</p>}
        {capture.status==='idle'&&open&&<div className="sdk-consent"><h2>Start a local problem report</h2><p>With your consent, this page records masked layout, clicks, input types, available errors and failed-request metadata for up to 5 minutes. Origins and short test IDs may remain. Text, input values, assets and URL paths are excluded.</p><p>Stop to review, export or discard. Only Submit report sends it to this site’s project owner for up to 30 days. Closing/reloading this page loses the in-memory copy.</p><label className="sdk-check"><input type="checkbox" checked={consent} onChange={(event)=>setConsent(event.target.checked)}/>I consent to recording this page until I stop or the limit is reached.</label><div className="capture-actions"><button className="button primary" disabled={!consent} onClick={start}>Start recording</button><button className="button" onClick={()=>{setOpen(false);setConsent(false);}}>Cancel</button></div></div>}
        {capture.status==='recording'&&<><div className="section-heading"><div><h2>Recording this page</h2><p role="status">{capture.events} events · {(capture.bytes/1024).toFixed(1)} KiB in memory</p></div><div className="capture-actions"><button className="button primary" onClick={()=>recorder.stop()}>Stop and review</button><button className="button" onClick={()=>setDiscarding(true)}>Discard recording</button></div></div><p>Reproduce the problem below, then stop. Nothing uploads while recording.</p></>}
        {capture.status==='stopped'&&<><div className="section-heading"><div><h2>Review before submitting</h2><p>Recording ended: {capture.reason}. Evidence stays in memory on this page.</p></div><button className="button" disabled={busy} onClick={()=>setDiscarding(true)}>Discard local recording</button></div><div className="capture-actions"><button className="button primary" disabled={busy||submitted||dirty||!endpoint||!projectKey} onClick={()=>void submit()}>{busy?'Submitting…':submitted?'Submitted':'Submit report'}</button></div>{dirty&&<p>Save the edited report details before submitting.</p>}{(!endpoint||!projectKey)&&<p>Public submission is not configured. Follow docs/website-sdk.md to set this sample’s public endpoint and project key, then restart. Export works locally.</p>}</>}
        {message&&<p role="status" className="operation-status">{message}</p>}
      </section>
      {!currentReport&&<div className="demo-grid"><section className="panel"><h2>Reproduce an unsaved order</h2><p>Only synthetic data. Submit deliberately leaves the order unsaved.</p><form className="demo-form" onSubmit={brokenSubmit}><label htmlFor="sample-email">Email</label><input id="sample-email" data-testid="sample-email" type="email" defaultValue="SYNTHETIC_SDK_SECRET@example.invalid"/><label htmlFor="sample-notes">Order notes</label><textarea id="sample-notes" defaultValue="SYNTHETIC_SDK_NOTES_SECRET"/><button className="button primary" data-testid="submit-order">Submit order</button></form><p role="status">{demoStatus} Submit attempts: {attempts}</p></section><section className="panel"><h2>Add diagnostic evidence</h2><p>These actions trigger real, intentional failures on this sample page.</p><div className="sdk-diagnostics"><button className="button" data-testid="throw-error" onClick={()=>setTimeout(()=>{throw new Error('SYNTHETIC_SDK_ERROR_SECRET');},0)}>Throw error</button><button className="button" data-testid="fail-fetch" onClick={()=>void fetch('/api/fail-fetch').then((response)=>response.text())}>Fail fetch (503)</button></div><div data-reprokit-mask="" className="notice">Explicitly masked region: SYNTHETIC_SDK_REGION_SECRET</div><p>Masking cannot make a hostile host page trustworthy. Review every report before sharing.</p></section></div>}
      {currentReport&&<div data-reprokit-ui=""><ReportViewer key={currentReport.id} report={currentReport} onChange={(value)=>{setReport(value);setSubmitted(false);}} onDirtyChange={setDirty}/></div>}
      {discarding&&<div data-reprokit-ui=""><Confirm title="Discard the local recording?" description="This removes the report from this page’s memory. Submitted and downloaded copies remain." action="Discard recording" onCancel={()=>setDiscarding(false)} onConfirm={discard}/></div>}
    </main></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
