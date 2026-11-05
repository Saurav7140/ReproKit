import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from 'react';
import { readReportFile, ReportValidationError, type Report } from '@reprokit/core';
import { ReportViewer } from './ReportViewer';
import { Confirm } from './Confirm';

export function LocalReports({ report, onChange, onRemove, active = true, onDirtyChange, fileInputRef, compactDetails, emptyState, onImportStateChange }: { report: Report | null; onChange: (report: Report) => void; onRemove: () => void; active?: boolean; onDirtyChange?: (dirty: boolean) => void; fileInputRef?: RefObject<HTMLInputElement | null>; compactDetails?: boolean; emptyState?: ReactNode; onImportStateChange?: (loading: boolean) => void }) {
  const ownInput = useRef<HTMLInputElement>(null); const input = fileInputRef ?? ownInput;
  const importButton = useRef<HTMLButtonElement>(null);
  const operation = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<Report | null>(null);
  const [removing, setRemoving] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => () => { operation.current?.abort(); }, []);
  useEffect(() => { onImportStateChange?.(loading); return () => onImportStateChange?.(false); }, [loading, onImportStateChange]);
  function cancel() {
    operation.current?.abort(); operation.current = null; setLoading(false); setPending(null); setMessage('Import cancelled. The current report is unchanged.');
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    operation.current?.abort();
    const abort = new AbortController(); operation.current = abort;
    setLoading(true); setError(''); setMessage('');
    try {
      const imported = await readReportFile(file, abort.signal);
      if (abort.signal.aborted) return;
      if (report) setPending(imported); else { onChange(imported); setRevision((value) => value + 1); setMessage('Report imported locally. Nothing uploaded.'); }
    } catch (failure) {
      if (!abort.signal.aborted) setError(failure instanceof ReportValidationError ? failure.message : 'The report file could not be read. Choose a local JSON report and try again.');
    } finally { if (operation.current === abort) { setLoading(false); operation.current = null; } }
  }
  return <div className="local-reports">
    <div className="local-toolbar"><span className="local-report-state"><span>{report ? '1 local report' : '0 reports'}</span><span>In this page’s memory</span></span><div className="capture-actions"><button ref={importButton} className={`button ${report ? '' : 'primary'}`} disabled={loading || Boolean(pending)} aria-describedby="import-help" onClick={() => input.current?.click()}>Import report</button>{loading && <button className="button" onClick={cancel}>Cancel import</button>}{report && <button className="button" disabled={loading} onClick={() => setRemoving(true)}>Remove report</button>}</div></div>
    <input className="file-input" ref={input} type="file" accept=".reprokit.json,.json,application/json" aria-label="Choose a ReproKit report" onChange={(event) => void importFile(event)} />
    <p id="import-help" className="import-help">Versions 1 to 4. .reprokit.json / .json. Up to 5 MiB. Imports stay local; closing or reloading this page clears them.</p>
    {(loading || message) && <p className="operation-status" role="status">{loading ? 'Reading and validating report…' : message}</p>}{error && <p className="error" role="alert">{error} The current report is unchanged.</p>}
    {report ? <ReportViewer key={`${report.id}-${revision}`} report={report} onChange={onChange} active={active} onDirtyChange={onDirtyChange} compactDetails={compactDetails} /> : emptyState ?? <section className="empty-state"><h2>No local report open</h2><p>Import an exported report to investigate its timeline, failures and available replay. No extension, account or backend is required.</p></section>}
    {pending && <Confirm title="Replace the current report?" description={`“${pending.title}” is valid and ready to open. Replacing removes the current report and any unsaved edits from this page. Export anything you need first.`} action="Replace report" onCancel={cancel} onConfirm={() => { onChange(pending); setRevision((value) => value + 1); setPending(null); setError(''); setMessage('Report imported locally. Nothing uploaded.'); }} />}
    {removing && <Confirm title="Remove this local report?" description={`“${report?.title ?? 'This report'}” will be removed from this page, including unsaved edits. Downloaded files are not deleted.`} action="Remove report" onCancel={() => setRemoving(false)} onConfirm={() => { onRemove(); setRemoving(false); setMessage('Local report removed. Downloaded files remain on your device.'); requestAnimationFrame(() => importButton.current?.focus()); }} />}
  </div>;
}
