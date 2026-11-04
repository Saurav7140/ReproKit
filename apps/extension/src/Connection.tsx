import { useEffect,useRef,useState,type FormEvent } from 'react';
import { createClient,type Session } from '@supabase/supabase-js';
import { dashboardReportUrl,hostedConfiguration,hostedReportSchema,projectSchema,PROJECT_FIELDS,type Project,type Report } from '@reprokit/core';
import { HostedAuthenticationError,requestHosted } from '../../shared/hosted-request';

const config=hostedConfiguration(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const dashboard=new URL(import.meta.env.VITE_DASHBOARD_ORIGIN || 'http://127.0.0.1:5173').origin;
const newClient=()=>config?createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20_000)})}}):null;

export function Connection({report,dirty}:{report:Report|null;dirty:boolean}) {
  const [client,setClient]=useState(newClient);
  const [connecting,setConnecting]=useState(false);const [session,setSession]=useState<Session|null>(null);
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');
  const [projects,setProjects]=useState<Project[]>([]);const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [saved,setSaved]=useState('');
  const inFlight=useRef(false);const mounted=useRef(true);const revision=useRef(0);
  useEffect(()=>{mounted.current=true;if(!client)return;const {data}=client.auth.onAuthStateChange((_event,next)=>{setSession(next);if(!next){setProjects([]);setSelected('');setSaved('');}});return()=>{mounted.current=false;data.subscription.unsubscribe();client.auth.stopAutoRefresh();};},[client]);
  useEffect(()=>{revision.current++;setSaved('');setMessage('');},[report]);
  async function refresh(){
    if(!client)return;
    const result=await client.from('projects').select(PROJECT_FIELDS).order('created_at').limit(25);
    if(result.error)throw new Error('Projects could not load. Check your connection or reconnect, then retry.');
    const parsed=projectSchema.array().safeParse(result.data);if(!parsed.success)throw new Error('Unexpected project response. Check hosted setup.');
    if(mounted.current){setProjects(parsed.data);setSelected((old)=>parsed.data.some((item)=>item.id===old)?old:'');}
  }
  async function connect(event:FormEvent){
    event.preventDefault();if(!client||inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
    try{const result=await client.auth.signInWithPassword({email,password});if(result.error)throw new Error(result.error.code==='email_not_confirmed'?'Confirm your account email in the dashboard first.':'Sign-in failed. Check your email/password and connection, then retry.');setPassword('');await refresh();setConnecting(false);setMessage('Connected for this open review page. Nothing has uploaded.');}
    catch(failure){setError(failure instanceof Error?failure.message:'Connection failed. Your local report is unchanged.');}
    finally{inFlight.current=false;setBusy(false);}
  }
  function clearConnection(){
    if(client){client.auth.stopAutoRefresh();void client.auth.signOut({scope:'local'}).catch(()=>{});}
    setClient(newClient());setSession(null);setProjects([]);setSelected('');setSaved('');setConnecting(false);setPassword('');setEmail('');
  }
  function disconnect(){
    if(!client||inFlight.current)return;clearConnection();setError('');setMessage('Disconnected from this review page. Your local report is unchanged.');
  }
  async function upload(){
    if(!client||!report||dirty||!selected||inFlight.current)return;
    const submitted=revision.current;inFlight.current=true;setBusy(true);setError('');setSaved('');setMessage('Uploading the reviewed report…');
    try{const response=await requestHosted(client,config,'upload',selected,report) as {report?:unknown};const parsed=hostedReportSchema.safeParse(response.report);if(!parsed.success||parsed.data.project_id!==selected||parsed.data.report_id!==report.id||parsed.data.lifecycle!=='ready')throw new Error('Unexpected upload response. Your local report is unchanged.');if(submitted!==revision.current){setMessage('An earlier reviewed report finished uploading. Review the current report before uploading it.');return;}setSaved(dashboardReportUrl(dashboard,parsed.data.project_id,parsed.data.id));setMessage('Report saved privately. Your local copy is unchanged.');}
    catch(failure){if(failure instanceof HostedAuthenticationError)clearConnection();setMessage('');setError(failure instanceof Error?failure.message:'Upload failed. Your local report is unchanged. Retry.');}
    finally{inFlight.current=false;setBusy(false);}
  }
  return <section className="extension-connection" aria-label="Dashboard connection"><div className="section-heading"><h2>Your dashboard connection</h2>{session&&<button className="button" disabled={busy} onClick={()=>void disconnect()}>Disconnect</button>}</div>
    <p>Uploads start only when you click Upload reviewed report. Connection tokens stay in this review page's memory and clear when it closes.</p>
    {!client?<p>Hosted access is not configured. Add the public Supabase settings to the dashboard or extension environment, rebuild and reload. Local capture/export still work.</p>:!session?<>{!connecting?<button className="button" onClick={()=>{client.auth.startAutoRefresh();setConnecting(true);setError('');}}>Connect to dashboard</button>:<form className="extension-signin" onSubmit={(event)=>void connect(event)}><label htmlFor="connection-email">Account email</label><input id="connection-email" type="email" autoComplete="email" required value={email} onChange={(event)=>setEmail(event.target.value)}/><label htmlFor="connection-password">Account password</label><input id="connection-password" type="password" autoComplete="current-password" required value={password} onChange={(event)=>setPassword(event.target.value)}/><div className="capture-actions"><button className="button primary" disabled={busy}>{busy?'Connecting…':'Sign in to connect'}</button><button type="button" className="button" disabled={busy} onClick={()=>{setConnecting(false);setPassword('');setError('');}}>Cancel connection</button></div></form>}<a href={`${dashboard}/?view=hosted`} target="_blank" rel="noreferrer">Create an account or reset your password in the dashboard ↗</a></>:<><p>Connected as {session.user.email}</p><div className="connection-controls"><label htmlFor="upload-project">Project</label><select id="upload-project" disabled={busy} value={selected} onChange={(event)=>{setSelected(event.target.value);setSaved('');setMessage('');}}><option value="">Choose a project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.name}</option>)}</select><button className="button" disabled={busy} onClick={()=>{setError('');setBusy(true);void refresh().catch((failure)=>setError(failure instanceof Error?failure.message:'Projects could not load.')).finally(()=>setBusy(false));}}>Refresh projects</button><button className="button primary" disabled={busy||!report||dirty||!selected} onClick={()=>void upload()}>{busy?'Working…':'Upload reviewed report'}</button></div>{!projects.length&&<p>No projects found. Create one in the dashboard, then refresh.</p>}{!report&&<p>Record or import a report before uploading.</p>}{dirty&&<p className="error">Save your local report details before uploading.</p>}</>}
    {message&&<p className="operation-status" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}{saved&&<a className="button" href={saved} target="_blank" rel="noreferrer">Open saved report in dashboard ↗</a>}
  </section>;
}
