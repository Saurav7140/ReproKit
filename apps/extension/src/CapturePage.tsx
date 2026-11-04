import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { LIMITS, type Report } from '@reprokit/core';
import { Mark } from '../../shared/Mark';
import { LocalReports } from '../../shared/LocalReports';
import type { CaptureController } from './controller';
import { Connection } from './Connection';
import { AppearanceControl, useAppearance } from '../../shared/Appearance';
import { Icon } from '../../shared/Icon';
import './review.css';

const dashboard = new URL(import.meta.env.VITE_DASHBOARD_ORIGIN || 'http://127.0.0.1:5173').origin;

export function CapturePage({ capture }: { capture: CaptureController }) {
  const view = useSyncExternalStore(capture.subscribe, capture.snapshot);
  const [report, setReport] = useState<Report | null>(null);
  const [dirty,setDirty]=useState(false);
  const [importing,setImporting]=useState(false);
  const input = useRef<HTMLInputElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const sharing = useRef<HTMLDetailsElement>(null);
  const theme = useAppearance();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabId = Number(params.get('tab'));
    if (params.get('start') === '1' && Number.isInteger(tabId) && tabId > 0) {
      history.replaceState(null, '', 'review.html'); capture.begin(tabId);
    }
  }, [capture]);
  useEffect(() => {
    if (view.report) { setReport(view.report); capture.releaseBuffer(); }
  }, [view.report, capture]);
  const active = view.status === 'recording' || view.status === 'starting';
  const status = view.status === 'recording' ? 'RECORDING selected tab' : view.status === 'starting' ? 'Starting capture…' : view.status === 'stopped' ? 'Recording stopped' : report ? 'Local report open' : view.status === 'discarded' ? 'Capture discarded' : view.status === 'error' ? 'Capture unavailable' : 'Not recording';
  const workflow = <ol className="review-workflow" aria-label="Investigation workflow"><li aria-current={!report ? 'step' : undefined}><span>1</span><div><strong>Open or record</strong><p>Bring the problem here</p></div></li><li aria-current={report ? 'step' : undefined}><span>2</span><div><strong>Review the evidence</strong><p>Replay, errors and test draft</p></div></li><li><span>3</span><div><strong>Export or save</strong><p>You choose what leaves this page</p></div></li></ol>;
  return <div className="review-workspace">
    <a className="skip-link" href="#investigation">Skip to investigation</a>
    <header className="review-header"><div className="brand"><Mark />ReproKit<span>{active ? 'Browser extension' : 'Browser extension \u00b7 Not recording'}</span></div><div className="review-header-actions"><AppearanceControl value={theme.appearance} resolved={theme.resolved} onChange={theme.choose}/><a className="button" href={dashboard} target="_blank" rel="noreferrer">Open dashboard<Icon name="arrow"/></a></div></header>
    <main id="investigation" className={`review-main ${!report ? 'review-empty' : ''} ${importing ? 'review-reading' : ''}`}>
      <div className="review-heading"><div><p className="review-context">Local investigation</p><h1>{active ? 'Recording selected tab' : report ? 'Review your report' : 'Start an investigation'}</h1><p>{active ? 'Keep this page open. Return to the selected tab and reproduce the problem.' : report ? 'Find the failure, add context and choose what to share.' : 'Open a saved recording, or capture a problem from your browser.'}</p></div>{active && <div className="capture-actions"><button className="button primary" onClick={() => void capture.finish()}>Stop recording</button><button className="button" onClick={() => { capture.discard(); setReport(null); }}>Discard capture</button></div>}</div>
      {(active || report) && workflow}
      {(active || report || view.reason || view.error) && <div className={`notice review-status ${active ? 'recording-notice' : ''}`} role="status"><strong>{status}</strong><span>{view.reason ? `End reason: ${view.reason}.` : active ? 'Stop or discard here, or use the recording indicator in the selected tab.' : 'Local reports clear when you close or reload this page. Export a copy to keep it.'}</span></div>}
      {view.error && <p className="error" role="alert">{view.error}</p>}
      {active ? <dl className="counts capture-counts"><div><dt>Elapsed</dt><dd>{(view.elapsed / 1000).toFixed(0)} <small>/ 300 s</small></dd></div><div><dt>Buffered events</dt><dd>{view.events.toLocaleString('en-US')} <small>/ {LIMITS.events.toLocaleString('en-US')}</small></dd></div><div><dt>Payload</dt><dd>{(view.bytes / 1024).toFixed(1)} <small>KiB / 5 MiB</small></dd></div></dl> : <>
        <div className={!report ? 'review-start-grid' : undefined}>
          <LocalReports report={report} onChange={setReport} onRemove={() => { setReport(null); capture.discard(); if (sharing.current) sharing.current.open=false; requestAnimationFrame(() => importButton.current?.focus()); }} onDirtyChange={setDirty} fileInputRef={input} onImportStateChange={setImporting} compactDetails emptyState={<section className="review-import"><Icon name="reports"/><h2>Have a report file?</h2><p>Open a <code>.reprokit.json</code> file to investigate its timeline, failures and replay.</p><button ref={importButton} className="button primary" disabled={importing} onClick={() => input.current?.click()}><Icon name="upload"/>Import report</button><p className="review-footnote">No account needed. Imports stay on this device; export before closing. Versions 1–4 · Up to 5 MiB.</p></section>}/>
          {!report && <section className="review-record"><Icon name="capture"/><h2>Need to record a new problem?</h2><ol><li>Open the website where the problem happens.</li><li>Click ReproKit in your browser toolbar and choose <strong>Start recording this tab</strong>.</li><li>Reproduce the problem, then stop. Your report opens here for review.</li></ol><a href="http://127.0.0.1:5174/" target="_blank" rel="noreferrer">Try the local practice page ↗</a></section>}
        </div>
        {!report && workflow}
        {report && <p className="review-evidence-help"><Icon name="help"/><span>Start with <strong>Timeline</strong> to see the sequence, <strong>Replay</strong> to watch it and <strong>Reproduction</strong> for an editable Playwright draft. Use <strong>Report details</strong> to describe the bug before exporting.</span></p>}
        <details ref={sharing} className="review-sharing"><summary>Save to a private project<span>Optional · Connect your account and upload after review</span></summary><Connection report={report} dirty={dirty}/></details>
      </>}
      <details className="review-help"><summary>Capture help & privacy</summary><div><h2>Recording starts from your browser toolbar</h2><p>This investigation page does not start recording on its own. On a supported website, click the ReproKit toolbar action and explicitly start. Keep its review page open; Stop and Discard remain available. Full navigation or reload ends source capture.</p><h2>What the recording contains</h2><p>Text, form values, arbitrary attributes, paths and error messages are masked or removed. Origins and short test IDs remain visible. Resource Timing may omit methods, transport failures, unfinished fetch responses and hidden cross-origin statuses.</p><h2>Review before sharing</h2><p>Replay shows captured behavior without restoring authentication or backend state. Inspect evidence and your description, then export a local file or explicitly upload to a private project. Closing this page clears its report and temporary connection.</p></div></details>
    </main>
  </div>;
}
