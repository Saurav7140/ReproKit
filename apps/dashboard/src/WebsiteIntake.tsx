import { useEffect,useState,type FormEvent } from 'react';
import { websiteIntakeSchema,websiteOrigin } from '@reprokit/core';
import { supabase,hostedConfig } from './hosted-client';

export function WebsiteIntake({project}:{project:string}){
  const [open,setOpen]=useState(false);const [loaded,setLoaded]=useState(false);const [origin,setOrigin]=useState('http://127.0.0.1:5176');
  const [enabled,setEnabled]=useState(false);const [key,setKey]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  useEffect(()=>{
    if(!open)return;let live=true;setBusy(true);setError('');
    void Promise.resolve(supabase!.from('website_intakes').select('project_id,public_key,origin,enabled').eq('project_id',project).maybeSingle()).then((result)=>{
      if(!live)return;if(result.error){setError('Website intake could not load. Check sign-in and the Phase 7 migration.');return;}
      try{if(result.data){const row=websiteIntakeSchema.parse(result.data);setOrigin(row.origin);setEnabled(row.enabled);setKey(row.public_key);}setLoaded(true);}catch{setError('Website intake returned invalid configuration.');}
    }).catch(()=>{if(live)setError('Website intake could not load. Close and reopen to retry.');}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};
  },[open,project]);
  async function save(event:FormEvent|undefined,rotate=false){
    event?.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const value=websiteOrigin(origin.trim());const result=await supabase!.rpc('configure_website_intake',{p_project:project,p_origin:value,p_enabled:enabled,p_rotate:rotate});
      if(result.error)throw new Error('Website intake was not saved. Check your session and project ownership.');
      const row=websiteIntakeSchema.parse(Array.isArray(result.data)?result.data[0]:result.data);setOrigin(row.origin);setEnabled(row.enabled);setKey(row.public_key);setMessage(rotate?'Key rotated. Update the website configuration; the old key stops working. The hourly quota is unchanged.':'Website intake configuration saved.');
    }catch(failure){setError(failure instanceof Error?failure.message:'Configuration could not be saved.');}finally{setBusy(false);}
  }
  return <details className="website-intake" onToggle={(event)=>setOpen(event.currentTarget.open)}><summary>Website SDK intake</summary>{open&&<div className="intake-content"><p>Optional write-only submissions from your site. Keys are public routing values. Origin checks constrain browsers; other callers can spoof them. An attacker can consume the shared quota.</p><p>10 attempts/hour, 20 reports in this project, 5 MiB/report, 30-day retention. Add upstream bot protection before broad public use.</p>
    <form className="demo-form" onSubmit={(event)=>void save(event)}><label htmlFor={`origin-${project}`}>Allowed website origin</label><input id={`origin-${project}`} required maxLength={300} disabled={busy||!loaded} value={origin} onChange={(event)=>setOrigin(event.target.value)} placeholder="https://your-site.example"/><label className="intake-check"><input type="checkbox" checked={enabled} disabled={busy||!loaded} onChange={(event)=>setEnabled(event.target.checked)}/>Enable public website submissions</label><div className="capture-actions"><button className="button" disabled={busy||!loaded}>Save website intake</button><button type="button" className="button" disabled={busy||!loaded||!key} onClick={()=>void save(undefined,true)}>Rotate public key</button></div></form>
    {key&&<><label htmlFor={`key-${project}`}>Public project key</label><input id={`key-${project}`} readOnly value={key}/><p>Public endpoint</p><code>{hostedConfig?.url}/functions/v1/reprokit-public</code><p>Set these two public values in apps/sdk-demo/.env.local and restart npm run dev:sdk. See docs/website-sdk.md for host integration.</p></>}
    {busy&&<p role="status">Updating website intake…</p>}{error&&<p role="alert" className="error">{error}</p>}{message&&<p role="status">{message}</p>}
  </div>}</details>;
}
