import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { parseReport, prepareReportExport, ReportValidationError, type Report } from '@reprokit/core';
import { Replay } from './Replay';
import { Reproduction } from './Reproduction';

const seconds = (value: number) => `${(value / 1000).toFixed(3)} s`;
const PAGE_SIZE = 50;
type Pane = 'Timeline' | 'Errors' | 'Failed requests' | 'Replay' | 'Reproduction' | 'Context';

export function ReportViewer({ report, onChange, active = true, onDirtyChange, compactDetails = false }: { report: Report; onChange: (report: Report) => void; active?: boolean; onDirtyChange?: (dirty: boolean) => void; compactDetails?: boolean }) {
  const id = useId();
  const [title, setTitle] = useState(report.title);
  const [description, setDescription] = useState(report.description);
  const [pane, setPane] = useState<Pane>('Timeline');
  const [reproductionOpened, setReproductionOpened] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [inspect, setInspect] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const downloadUrls = useRef(new Set<string>());
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => () => { downloadUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  const dirty = title !== report.title || description !== report.description;
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); },[dirty,onDirtyChange]);
  const web = report.evidence.kind === 'web' ? report.evidence : null;
  const duration = Date.parse(report.capture.endedAt) - Date.parse(report.capture.startedAt);
  const timeline = useMemo(() => report.timeline.filter((event) => filter === 'all' || event.kind === filter), [report.timeline, filter]);
  const rows = pane === 'Timeline' ? timeline : pane === 'Errors' ? web?.errors ?? [] : web?.failedRequests ?? [];
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const activePage = Math.min(page, pages - 1);

  function save(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    try {
      const updated = parseReport(JSON.stringify({ ...report, title, description }));
      onChange(updated); setTitle(updated.title); setDescription(updated.description); setMessage('Report details saved locally.');
    } catch { setError('Details could not be saved. Enter a non-empty title up to 160 characters and a description up to 10,000 characters; the full report must stay within 5 MiB.'); }
  }
  function exportReport() {
    setError(''); setMessage('');
    try {
      const exported = prepareReportExport(report);
      const url = URL.createObjectURL(new Blob([exported.text], { type: 'application/json' }));
      downloadUrls.current.add(url);
      const link = document.createElement('a'); link.href = url; link.download = exported.filename;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.current.delete(url); }, 1000);
      setMessage('Report export requested. The downloaded file stays on your device until you delete it.');
    } catch (failure) { setError(failure instanceof ReportValidationError ? failure.message : 'The report could not be exported. Check its details and try again.'); }
  }
  const canReplay = report.capabilities.replay === 'available' && Boolean(web?.replay && web.replay.length >= 2 && web.replay.some((event) => event.type === 2));
  const Details = compactDetails ? 'details' : 'div';
  return <section className="report-viewer" aria-labelledby={id + '-heading'}>
    <div className="report-heading"><div><h2 id={id + '-heading'} ref={heading} tabIndex={-1}>{report.title}</h2><p>{report.source.platform} · {report.source.method} · Version {report.formatVersion}</p></div><button className="button primary" disabled={dirty} aria-describedby={id + '-export-help'} onClick={exportReport}>Export report</button></div>
    <p id={id + '-export-help'} className="muted">{dirty ? 'Save your edited details before exporting.' : 'Review the evidence and your description before exporting. Nothing uploads.'}</p>
    <Details className={compactDetails ? 'report-details-disclosure' : undefined}>
    {compactDetails && <summary>Report details<span>{dirty ? 'Unsaved changes' : 'Edit title & description'}</span></summary>}
    <form className="report-details" onSubmit={save}>
      <div><label htmlFor={id + '-title'}>Report title</label><input id={id + '-title'} required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
      <div><label htmlFor={id + '-description'}>Description</label><textarea id={id + '-description'} maxLength={10_000} value={description} onChange={(event) => setDescription(event.target.value)} aria-describedby={id + '-description-help'} /><p id={id + '-description-help'}>Your title and description are exported as entered. Check them for sensitive information.</p></div>
      <button className="button" type="submit" disabled={!dirty}>Save details</button>
    </form>
    </Details>
    {message && <p className="operation-status" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
    <dl className="report-metrics"><div><dt>Duration</dt><dd>{(duration / 1000).toFixed(1)} s</dd></div><div><dt>Timeline</dt><dd>{report.timeline.length.toLocaleString('en-US')} events</dd></div><div><dt>Errors</dt><dd>{web?.errors.length ?? '—'}</dd></div><div><dt>Failed requests</dt><dd>{web?.failedRequests.length ?? '—'}</dd></div></dl>
    <div className="viewer-tabs" role="group" aria-label="Report evidence">{(['Timeline', 'Errors', 'Failed requests', 'Replay', 'Reproduction', 'Context'] as Pane[]).map((name) => <button key={name} aria-pressed={pane === name} onClick={() => { if (name === 'Reproduction') setReproductionOpened(true); setPane(name); setPage(0); }}>{name}</button>)}</div>
    <section className="evidence-pane" aria-label={`${pane} evidence`}>
      {reproductionOpened && <div hidden={pane !== 'Reproduction'}><Reproduction report={report} /></div>}
      {pane === 'Timeline' && <><div className="evidence-toolbar"><h3>Captured timeline</h3><label>Event type<select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}><option value="all">All events</option>{['capture-start','interaction','error','request','capture-stop','note'].map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label></div>{timeline.length ? <ol className="timeline-list">{timeline.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE).map((event, index) => <li key={`${index}-${event.atMs}`}><span className="event-time">{seconds(event.atMs)}</span><span className={`event-kind ${event.kind === 'error' ? 'error' : ''}`}>{event.kind}</span><span>{event.label}</span></li>)}</ol> : <p className="evidence-empty">No timeline events match this filter.</p>}</>}
      {pane === 'Errors' && <><h3>JavaScript failures</h3>{web && report.capabilities.errors === 'available' ? web.errors.length ? <ol className="diagnostic-list">{web.errors.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE).map((event, index) => <li key={index}><div><strong>{event.type}</strong><span className="event-time">{seconds(event.atMs)}</span></div><p>{event.message}</p>{event.stack && <pre>{event.stack}</pre>}</li>)}</ol> : <p className="evidence-empty">No JavaScript failures were captured.</p> : <p className="evidence-empty">Error evidence is {report.capabilities.errors} for this report.</p>}</>}
      {pane === 'Failed requests' && <><h3>Failed-request metadata</h3>{web && report.capabilities.requests === 'available' ? web.failedRequests.length ? <div className="request-table" tabIndex={0} role="region" aria-label="Scrollable failed requests"><table><thead><tr><th>Time</th><th>Transport / method</th><th>Sanitized URL</th><th>Status</th></tr></thead><tbody>{web.failedRequests.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE).map((event, index) => <tr key={index}><td className="event-time">{seconds(event.atMs)}</td><td>{event.transport}<span>{event.method === 'OTHER' ? 'Method unavailable' : event.method}</span></td><td><code>{event.url}</code><span>{event.outcome}</span></td><td className="num">{event.status}</td></tr>)}</tbody></table></div> : <p className="evidence-empty">No failed requests were captured.</p> : <p className="evidence-empty">Request evidence is {report.capabilities.requests} for this report.</p>}<p className="muted">Bodies and headers are never included. Available metadata depends on the capture method.</p></>}
      {['Timeline', 'Errors', 'Failed requests'].includes(pane) && rows.length > PAGE_SIZE && <div className="pagination"><button className="button" disabled={activePage === 0} onClick={() => setPage(activePage - 1)}>Previous events</button><span>{activePage * PAGE_SIZE + 1}–{Math.min(rows.length, (activePage + 1) * PAGE_SIZE)} of {rows.length}</span><button className="button" disabled={activePage + 1 >= pages} onClick={() => setPage(activePage + 1)}>Next events</button></div>}
      {pane === 'Replay' && active && (canReplay ? <Replay report={report} /> : <div className="evidence-empty"><h3>Replay unavailable</h3><p>This report does not contain a supported DOM session. Other evidence remains available.</p></div>)}
      {pane === 'Context' && <div className="context-grid"><section><h3>Capture environment</h3><dl className="definition-list"><div><dt>Report ID</dt><dd><code>{report.id}</code></dd></div><div><dt>Started</dt><dd>{report.capture.startedAt}</dd></div><div><dt>Ended</dt><dd>{report.capture.endedAt}</dd></div><div><dt>OS</dt><dd>{report.environment.os}</dd></div>{report.environment.browser && <div><dt>Browser</dt><dd>{report.environment.browser.family} {report.environment.browser.majorVersion}</dd></div>}{report.environment.viewport && <div><dt>Viewport</dt><dd>{report.environment.viewport.width} × {report.environment.viewport.height} px</dd></div>}{web?.page && <div><dt>Page</dt><dd><code>{web.page.url}</code></dd></div>}</dl><h3>Suggested reproduction steps</h3>{report.suggestedSteps.length ? <ol>{report.suggestedSteps.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p>No steps were supplied. Open Reproduction to derive a draft from available web actions.</p>}</section><section><h3>Capabilities</h3><ul className="channel-list">{Object.entries(report.capabilities).map(([name, value]) => <li key={name}><span>{name}</span><span>{value}</span></li>)}</ul><h3 className="limitations-heading">Report limitations</h3><ul className="limitation-list">{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></section></div>}
    </section>
    <details className="raw-report" onToggle={(event) => setInspect(event.currentTarget.open)}><summary>Inspect report JSON</summary>{inspect && <pre data-testid="capture-json">{JSON.stringify(report, null, 2)}</pre>}</details>
  </section>;
}
