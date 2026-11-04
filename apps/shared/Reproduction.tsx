import { useEffect, useId, useRef, useState } from 'react';
import { generateReproduction, type Report } from '@reprokit/core';

export function Reproduction({ report }: { report: Report }) {
  const id = useId();
  const [draft] = useState(() => generateReproduction(report));
  const [source, setSource] = useState(draft.source ?? '');
  const [message, setMessage] = useState('');
  const urls = useRef(new Set<string>());
  useEffect(() => () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([source], { type: 'text/plain;charset=utf-8' }));
      urls.current.add(url);
      const link = document.createElement('a'); link.href = url; link.download = `${report.id}.spec.ts`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
      setMessage('Playwright source export requested. Edits stay in this page; report JSON does not include your edited test.');
    } catch { setMessage('The test could not be exported. Your draft is still in this page; try again.'); }
  }
  if (!draft.source) return <div className="evidence-empty"><h3>Reproduction unavailable</h3><p>{draft.warnings[0]}</p></div>;
  return <div className="reproduction">
    <h3>Suggested reproduction steps</h3>
    <p>Derived from captured actions. Review the targets, starting state and intended result.</p>
    <ol className="reproduction-steps">{draft.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
    <h3>Editable Playwright draft</h3>
    <ul className="limitation-list">{draft.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    <label htmlFor={id + '-source'}>Playwright source</label>
    <textarea id={id + '-source'} className="source-editor" spellCheck={false} value={source} maxLength={524_288} onChange={(event) => setSource(event.target.value)} aria-describedby={id + '-help'} />
    <p id={id + '-help'}>Review and edit before running. TODO guards stop incomplete drafts from passing. Exported code runs only when you run it yourself; this viewer never executes it. Draft edits are lost when this report is removed or the page reloads.</p>
    <button className="button" disabled={!source.trim()} onClick={download}>Export Playwright test</button>
    {message && <p className="operation-status" role="status">{message}</p>}
    <details className="test-instructions"><summary>How to run the exported test</summary><p>Put the .spec.ts file in a project with @playwright/test and Chromium installed. Supply missing setup and values, replace the final TODO guard with your own assertions, then run:</p><pre>npx playwright test path/to/report.spec.ts</pre><p>A passing click sequence alone does not prove the bug. ReproKit does not invent expected outcomes or restore your original services.</p></details>
  </div>;
}
