import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PROJECT_FIELDS, REPORT_FIELDS, projectNameSchema, projectSchema, hostedReportSchema, reportStatusSchema, readReportLink, type Project, type HostedReport, type Report } from '@reprokit/core';
import { Confirm } from '../../shared/Confirm';
import { ReportViewer } from '../../shared/ReportViewer';
import { Auth, useHostedAuth } from './Auth';
import { supabase, hostedRequest, loadHostedReport } from './hosted-client';
import { WebsiteIntake } from './WebsiteIntake';
import { Icon } from '../../shared/Icon';

export function Hosted({ localReport, localDirty, onLocal, active }: { localReport: Report | null; localDirty: boolean; onLocal: () => void; active: boolean }) {
  const auth = useHostedAuth();
  if (!supabase) return <section className="prose"><h2>Connect your hosted workspace</h2><p>Local reports are ready to use. Hosted accounts and projects require your Supabase project configuration.</p><ol><li>Create a Supabase project and follow docs/hosted-setup.md to apply its migration, function and retention schedule.</li><li>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in apps/dashboard/.env.local. Use only a public publishable/anon key.</li><li>Restart the dashboard, then return here to create an account.</li></ol><button className="button" onClick={onLocal}>Open local reports</button></section>;
  return <div className="hosted-workspace">
    {!auth.ready ? <p role="status">Checking your session…</p> : <div className={!auth.session || auth.recovery ? 'hosted-entry' : undefined}>
      {(!auth.session || auth.recovery) && <section className="hosted-entry-copy"><h2>A private home for your reports</h2><p>Save the reports you have reviewed, keep investigations organized and pick up where you left off.</p><ul className="hosted-benefits"><li><h3>Projects, private to you</h3><p>Only your signed-in account can open your saved recordings.</p></li><li><h3>A clear investigation status</h3><p>Move reports from Open to Investigating to Resolved as you work.</p></li><li><h3>30-day report retention</h3><p>Hosted reads expire after 30 days, with scheduled cleanup. Export a copy to keep it longer.</p></li></ul></section>}
      <Auth session={auth.session} recovery={auth.recovery} onRecovered={() => { auth.setRecovery(false); history.replaceState(null,'','/?view=hosted'); }} />
    </div>}
    {auth.linkError && <p role="alert" className="error">{auth.linkError}</p>}
    {auth.session && !auth.recovery && <Projects key={auth.session.user.id} localReport={localReport} localDirty={localDirty} onLocal={onLocal} active={active} />}
  </div>;
}

function Projects({ localReport, localDirty, onLocal, active }: { localReport: Report | null; localDirty: boolean; onLocal: () => void; active: boolean }) {
  const [projects,setProjects] = useState<Project[]>([]); const [selected,setSelected] = useState('');
  const [name,setName] = useState(''); const [reports,setReports] = useState<HostedReport[]>([]);
  const [page,setPage] = useState(0); const [total,setTotal] = useState(0); const [loading,setLoading] = useState(false);
  const [busy,setBusy] = useState(false); const [error,setError] = useState(''); const [message,setMessage] = useState('');
  const [removing,setRemoving] = useState<HostedReport | null>(null);
  const [removingProject,setRemovingProject] = useState<Project | null>(null);
  const [opened,setOpened] = useState<{ id: string; report: Report } | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    let live=true;
    void (async()=>{
      const result=await supabase!.from('projects').select(PROJECT_FIELDS).order('created_at').limit(25);
      if(result.error)throw new Error('Projects could not load. Check sign-in and hosted setup, then refresh.');
      const projects=projectSchema.array().parse(result.data);if(!live)return;setProjects(projects);
      let link;try{link=readReportLink(location.search);}catch{throw new Error('This report link is invalid. Choose a project to continue.');}
      if(!link){setSelected(projects[0]?.id ?? '');return;}
      if(!projects.some((project)=>project.id===link.project))throw new Error('This report is unavailable to your account. Choose one of your projects.');
      setSelected(link.project);setBusy(true);
      const metadata=await supabase!.from('reports').select(REPORT_FIELDS).eq('id',link.report).eq('project_id',link.project).single();
      if(metadata.error)throw new Error('This report is unavailable or has been removed.');
      const item=hostedReportSchema.parse(metadata.data);const report=await loadHostedReport(item.id);
      if(report.id!==item.report_id)throw new Error('Hosted recording does not match its metadata.');
      if(live)setOpened({id:item.id,report});
    })().catch((failure)=>{if(live)setError(failure instanceof Error?failure.message:'Projects could not load. Retry.');}).finally(()=>{if(live)setBusy(false);});
    return()=>{live=false;sequence.current++;};
  },[]);
  async function refresh() {
    if (!selected) return;
    const operation = ++sequence.current; setLoading(true);
    try {
      const result = await supabase!.from('reports').select(REPORT_FIELDS,{ count: 'exact' }).eq('project_id',selected).order('created_at',{ ascending: false }).range(page*20,page*20+19);
      if (result.error) throw result.error;
      const parsed = hostedReportSchema.array().parse(result.data);
      if (operation === sequence.current) { setReports(parsed); setTotal(result.count ?? parsed.length); }
    } catch { if (operation === sequence.current) setError('Reports could not load. Your local report is unchanged. Retry or sign in again.'); }
    finally { if (operation === sequence.current) setLoading(false); }
  }
  useEffect(() => { setReports([]); setOpened(null); setError(''); void refresh(); return () => { sequence.current++; }; },[selected,page]);
  async function createProject(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await supabase!.rpc('create_project',{ p_name: projectNameSchema.parse(name) });
      if (result.error) throw result.error;
      const project = projectSchema.parse(Array.isArray(result.data) ? result.data[0] : result.data);
      setProjects((all) => [...all,project]); setSelected(project.id); setPage(0); setName(''); setMessage('Project created. It is private to your account.');
    } catch { setError('Project could not be created. Use a name of 1–80 characters, check your session/setup and the 25-project limit, then retry.'); }
    finally { setBusy(false); }
  }
  async function upload() {
    if (!localReport || localDirty || !selected) return;
    setBusy(true); setError(''); setMessage('Uploading the reviewed local report…');
    try { await hostedRequest('upload',selected,localReport); setMessage('Report saved to this private project. Your local copy is still open.'); await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Upload failed. Your local report is unchanged.'); setMessage(''); await refresh(); }
    finally { setBusy(false); }
  }
  async function openReport(item: HostedReport) {
    setBusy(true); setError('');
    try { const report = await loadHostedReport(item.id); if (report.id !== item.report_id) throw new Error('Hosted recording does not match its metadata.'); setOpened({ id: item.id,report }); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Report could not open. Retry.'); }
    finally { setBusy(false); }
  }
  async function status(item: HostedReport, value: string) {
    setBusy(true); setError('');
    try { const next = reportStatusSchema.parse(value); const result = await supabase!.from('reports').update({ status: next }).eq('id',item.id).select(REPORT_FIELDS).single(); if (result.error) throw result.error; const saved = hostedReportSchema.parse(result.data); setReports((rows) => rows.map((row) => row.id === saved.id ? saved : row)); }
    catch { setError('Status was not saved. Refresh the report list and check your session.'); }
    finally { setBusy(false); }
  }
  async function remove(item: HostedReport) {
    setRemoving(null); setBusy(true); setError(''); setMessage('Removing report and recording…');
    try { await hostedRequest('delete',item.id); if (opened?.id === item.id) setOpened(null); setMessage('Hosted report and recording removed. Downloaded/local copies are unchanged.'); await refresh(); }
    catch (failure) { setMessage(''); setError(failure instanceof Error ? failure.message : 'Deletion could not finish. It remains queued for retry.'); await refresh(); }
    finally { setBusy(false); }
  }
  async function removeProject(project: Project) {
    setRemovingProject(null); setBusy(true); setError(''); setMessage('Deleting project and its hosted reports…');
    let removedReports = 0;
    try {
      // Verify deletion support and ownership before removing any report objects.
      const first = await supabase!.rpc('delete_project', { p_project:project.id });
      if (first.error) {
        if (first.error.message !== 'project_not_empty') throw first.error;
        const result = await supabase!.from('reports').select(REPORT_FIELDS).eq('project_id',project.id).limit(100);
        if (result.error) throw result.error;
        const items = hostedReportSchema.array().parse(result.data);
        if (items.some(item => item.project_id !== project.id)) throw new Error('Unexpected project response.');
        for (const item of items) { await hostedRequest('delete',item.id); removedReports++; }
        const final = await supabase!.rpc('delete_project', { p_project:project.id });
        if (final.error) throw final.error;
      }
      const remaining = projects.filter(item => item.id !== project.id);
      setProjects(remaining);
      if (selected === project.id) { sequence.current++; setOpened(null); setReports([]); setTotal(0); setSelected(remaining[0]?.id ?? ''); setPage(0); }
      const url = new URL(location.href);
      if (url.searchParams.get('project') === project.id) { url.searchParams.delete('project'); url.searchParams.delete('report'); history.replaceState(null,'',url); }
      setMessage('Project and its hosted reports deleted. Local and downloaded copies are unchanged.');
    } catch (failure) {
      setMessage('');
      const code = (failure as { code?:string }).code;
      setError(code === 'PGRST202' && !removedReports ? 'Project deletion needs the latest backend migration. No reports were removed. See docs/hosted-setup.md.' : `Project deletion did not finish. ${removedReports ? `${removedReports} hosted report(s) were already removed. ` : ''}Check the remaining reports and retry; reload after exporting local work if the project no longer exists. Local and downloaded copies are unchanged.`);
      await refresh();
    } finally { setBusy(false); }
  }
  return <div className="hosted-content">
    <div className="notice"><strong>Private to your account</strong><span>Upload reports after review. Hosted copies have 30-day retention.</span></div>
    {message && <p role="status" className="operation-status">{message}</p>}{error && <p role="alert" className="error">{error}</p>}
    <div className="hosted-layout"><aside className="project-sidebar"><h2>Your projects</h2><ul>{projects.map((project) => <li key={project.id} className="project-list-row"><button className="project-select" disabled={busy} aria-pressed={selected === project.id} onClick={() => { setSelected(project.id); setPage(0); }}>{project.name}</button><button className="project-delete" disabled={busy} aria-label={`Delete project ${project.name}`} title={`Delete project ${project.name}`} onClick={() => setRemovingProject(project)}><Icon name="trash" /></button></li>)}</ul>{!projects.length && <p>No projects yet.</p>}
      <details className="project-create"><summary>New project</summary><form onSubmit={(event) => void createProject(event)}><label htmlFor="project-name">New project name</label><input id="project-name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /><button className="button" disabled={busy || projects.length >= 25}>Create project</button></form></details></aside>
      <section className="project-reports" aria-label="Project reports"><div className="section-heading"><h2>{projects.find((project) => project.id === selected)?.name ?? 'Choose a project'}</h2>{selected && <button className="button" disabled={busy || loading} onClick={() => { setError(''); void refresh(); }}>Refresh reports</button>}</div>
        {selected && (localReport ? <div className="upload-review"><h3>Save your reviewed report</h3><p>{localReport.title}</p>{localDirty && <p className="error">Save your local report details before uploading.</p>}<div className="capture-actions"><button className="button primary" disabled={busy || localDirty} onClick={() => void upload()}>Upload reviewed report</button><button className="button" onClick={onLocal}>Review local report</button></div><p>Only Upload sends this report to your project. A failed request preserves the local copy. A different payload with the same report ID cannot overwrite saved evidence.</p></div> : <div className="upload-prompt"><div><h3>Have a report to save?</h3><p>Open a local report, review it, then upload it to this project.</p></div><button className="button" onClick={onLocal}>Open local reports</button></div>)}
        {loading && <p role="status">Loading project reports…</p>}
        {!loading && selected && !reports.length && <div className="evidence-empty"><h3>No reports in this project yet</h3><p>Upload a reviewed report from this workspace or the extension to start an investigation.</p></div>}
        <ul className="hosted-report-list">{reports.map((item) => <li key={item.id}><div><h3>{item.title}</h3><p>{item.platform} · {(item.size_bytes/1024).toFixed(1)} KiB · {item.lifecycle === 'ready' ? '' : item.lifecycle === 'pending' ? 'Saving · ' : 'Removing · '}Expires {new Date(item.expires_at).toLocaleDateString()}</p>{item.lease_until && <p>Work lease until {new Date(item.lease_until).toLocaleTimeString()}. Retry after that time if unfinished.</p>}</div><div className="capture-actions"><button className="button" disabled={busy || item.lifecycle !== 'ready' || Date.parse(item.expires_at)<=Date.now()} onClick={() => void openReport(item)}>Open report</button><label>Status<select aria-label={`Status for ${item.title}`} value={item.status} disabled={busy || item.lifecycle !== 'ready' || Date.parse(item.expires_at)<=Date.now()} onChange={(event) => void status(item,event.target.value)}><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option></select></label><button className="button" disabled={busy} onClick={() => setRemoving(item)}>Delete hosted report</button></div></li>)}</ul>
        {total>20 && <div className="pagination"><button className="button" disabled={page===0 || busy} onClick={() => setPage(page-1)}>Previous reports</button><span>{page*20+1}–{Math.min(total,(page+1)*20)} of {total}</span><button className="button" disabled={(page+1)*20>=total || busy} onClick={() => setPage(page+1)}>Next reports</button></div>}
        {selected && <WebsiteIntake key={selected} project={selected}/>}
      </section></div>
    {opened && <section className="hosted-open"><div className="section-heading"><h2>Open hosted copy</h2><button className="button" onClick={() => setOpened(null)}>Close hosted copy</button></div><p>Details and test edits here affect this open copy only. Export them to keep changes. Report status is saved to the project.</p><ReportViewer key={opened.id} report={opened.report} onChange={(report) => setOpened((current) => current ? { ...current,report } : null)} active={active} compactDetails /></section>}
    {removing && <Confirm title="Delete this hosted report?" description={`“${removing.title}” and its stored recording will be removed. If removal fails, unfinished deletion is retained for retry. Local/downloaded copies are not deleted.`} action="Delete hosted report" onCancel={() => setRemoving(null)} onConfirm={() => void remove(removing)} />}
    {removingProject && <Confirm title="Delete this project?" description={`“${removingProject.name}” and all of its hosted reports and website intake settings will be permanently deleted. This cannot be undone. If interrupted, some reports may already be removed; the project remains for retry. Local and downloaded copies are unchanged.`} action="Delete project" onCancel={() => setRemovingProject(null)} onConfirm={() => void removeProject(removingProject)} />}
  </div>;
}
