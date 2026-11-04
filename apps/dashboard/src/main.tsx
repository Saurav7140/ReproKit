import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parseReport, type Report } from '@reprokit/core';
import { Mark } from '../../shared/Mark';
import { Confirm } from '../../shared/Confirm';
import { LocalReports } from '../../shared/LocalReports';
import { Hosted } from './Hosted';
import { AppearanceControl, useAppearance } from '../../shared/Appearance';
import { Icon } from '../../shared/Icon';
import { Overview, ReportEmpty, CaptureGuide, Help } from './WorkspacePages';
import '../../shared/style.css';
import './workspace.css';

const routes = [
  { name: 'Overview', key: 'overview', icon: 'overview' },
  { name: 'Reports', key: 'reports', icon: 'reports' },
  { name: 'Projects', key: 'hosted', icon: 'projects' },
  { name: 'Capture', key: 'capture', icon: 'capture' },
  { name: 'Help & privacy', key: 'help', icon: 'help' },
] as const;
type View = typeof routes[number]['name'];
function readView(): View { return routes.find(route => route.key === new URLSearchParams(location.search).get('view'))?.name ?? 'Overview'; }
const descriptions: Record<View, string> = {
  Overview: 'Record a problem, inspect the evidence and turn it into a test.',
  Reports: 'Investigate a local recording. Upload only when you choose to.',
  Projects: 'Your reviewed reports, organized in private projects.',
  Capture: 'Create a report from the browser tab where the problem happens.',
  'Help & privacy': 'Find your way around the workspace and understand what gets captured.',
};

function App() {
  const [view, setView] = useState<View>(readView);
  const [report, setReport] = useState<Report | null>(null);
  const [localDirty, setLocalDirty] = useState(false);
  const [exampleBusy, setExampleBusy] = useState(false);
  const [examplePending, setExamplePending] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const exampleOperation = useRef(0);
  const theme = useAppearance();
  useEffect(() => { const back = () => { exampleOperation.current++; setExampleBusy(false); setError(''); drawer.current?.close(); setView(readView()); }; window.addEventListener('popstate', back); return () => window.removeEventListener('popstate', back); }, []);
  useEffect(() => { document.title = `${view} · ReproKit`; }, [view]);
  useEffect(() => { const desktop = matchMedia('(min-width: 1001px)'); const close = () => { if (desktop.matches) drawer.current?.close(); }; desktop.addEventListener('change', close); return () => desktop.removeEventListener('change', close); }, []);
  function navigate(next: View) {
    exampleOperation.current++; setExampleBusy(false);
    drawer.current?.close();
    if (next === view) return;
    const url = new URL(location.href); url.searchParams.set('view', routes.find(route => route.name === next)!.key);
    if (next !== 'Projects') for (const key of ['project', 'report', 'recovery']) url.searchParams.delete(key);
    history.pushState(null, '', url); setView(next); setError('');
  }
  function importReport() { navigate('Reports'); requestAnimationFrame(() => fileInput.current?.click()); }
  async function loadExample() {
    const operation = ++exampleOperation.current;
    setExamplePending(false); setExampleBusy(true); setError('');
    try {
      const { default: source } = await import('./examples/checkout.reprokit.json');
      if (operation !== exampleOperation.current) return;
      const example = parseReport(JSON.stringify({ ...source, id: crypto.randomUUID() }));
      setReport(example); setLocalDirty(false); navigate('Reports');
    } catch { if (operation === exampleOperation.current) setError('The example could not open. Retry, or import a local report. Your current report is unchanged.'); }
    finally { if (operation === exampleOperation.current) setExampleBusy(false); }
  }
  const openExample = () => { if (importing) return; if (report) setExamplePending(true); else void loadExample(); };
  const nav = (mobile = false) => <><nav aria-label={mobile ? 'Mobile workspace' : 'Workspace'}>{routes.map(route => <button key={route.key} aria-current={view === route.name ? 'page' : undefined} className={route.key === 'help' ? 'nav-help' : undefined} onClick={() => { navigate(route.name); requestAnimationFrame(() => heading.current?.focus()); }}><Icon name={route.icon} /><span>{route.name}</span>{route.key === 'reports' && report && <span className="nav-count" aria-hidden="true">1</span>}</button>)}</nav><div className="workspace-sidebar-bottom"><AppearanceControl value={theme.appearance} resolved={theme.resolved} onChange={theme.choose} /><p><Icon name="shield" />Recording starts only with consent.</p></div></>;
  return <div className="workspace-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="workspace-sidebar"><a className="brand" href="/?view=overview" onClick={event => { event.preventDefault(); navigate('Overview'); }}><Mark />ReproKit</a><p className="workspace-label">Investigation workspace</p>{nav()}</aside>
    <header className="workspace-topbar"><button className="mobile-menu button" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => drawer.current?.showModal()}><Icon name="menu" /></button><span className="mobile-brand brand"><Mark />ReproKit</span><div className="workspace-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><span>{view}</span></div><span className="workspace-scope"><Icon name={view === 'Projects' ? 'shield' : 'reports'} />{view === 'Projects' ? 'Private workspace' : 'On this device'}</span></header>
    <main id="main" className="workspace-main"><div className="workspace-page-heading"><div><h1 ref={heading} tabIndex={-1}>{view === 'Overview' ? 'Your workspace' : view}</h1><p>{descriptions[view]}</p></div>{view === 'Reports' && <button className="text-action" onClick={() => navigate('Capture')}>How to record<Icon name="arrow" /></button>}</div>
      {error && <p className="error operation-status" role="alert">{error}</p>}
      {view === 'Overview' && <Overview report={report} dirty={localDirty} onReports={() => navigate('Reports')} onProjects={() => navigate('Projects')} onImport={importReport} onExample={openExample} onCapture={() => navigate('Capture')} exampleBusy={exampleBusy} importing={importing} />}
      <div hidden={view !== 'Reports'}><LocalReports report={report} onChange={value => { setReport(value); navigate('Reports'); }} onRemove={() => { setReport(null); setLocalDirty(false); }} active={view === 'Reports'} onDirtyChange={setLocalDirty} fileInputRef={fileInput} onImportStateChange={setImporting} compactDetails emptyState={<ReportEmpty onExample={openExample} onCapture={() => navigate('Capture')} exampleBusy={exampleBusy} importing={importing} />} /></div>
      <div hidden={view !== 'Projects'}><Hosted localReport={report} localDirty={localDirty} onLocal={() => navigate('Reports')} active={view === 'Projects'} /></div>
      {view === 'Capture' && <CaptureGuide onImport={importReport} />}
      {view === 'Help & privacy' && <Help />}
    </main>
    <dialog ref={drawer} className="workspace-drawer" aria-labelledby="drawer-title"><div className="drawer-heading"><h2 id="drawer-title">Workspace navigation</h2><button className="button" aria-label="Close navigation" autoFocus onClick={() => drawer.current?.close()}><Icon name="close" /></button></div>{nav(true)}</dialog>
    {examplePending && <Confirm title="Open the example report?" description="This replaces the local report and unsaved edits in this page. Export anything you need first. Hosted and downloaded copies are unchanged." action="Open example report" onCancel={() => setExamplePending(false)} onConfirm={() => void loadExample()} />}
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
