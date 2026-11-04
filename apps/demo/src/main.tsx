import { StrictMode, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Mark } from '../../shared/Mark';
import '../../shared/style.css';

function App() {
  const [status, setStatus] = useState('Ready. Trigger one deliberate failure at a time.');
  const [submits, setSubmits] = useState(0);
  function exception() {
    setStatus('JavaScript exception scheduled. The error is intentionally uncaught.');
    window.setTimeout(() => { throw new Error('ReproKit demo: intentional JavaScript exception'); }, 0);
  }
  function rejection() {
    setStatus('Unhandled promise rejection triggered.');
    void Promise.reject(new Error('ReproKit demo: intentional unhandled rejection'));
  }
  async function failedFetch() {
    try {
      const response = await fetch('/api/fail-fetch');
      await response.json();
      setStatus(`Fetch returned HTTP ${response.status}. HTTP errors resolve; response.ok is ${response.ok}.`);
    } catch { setStatus('Fetch transport failed. Check that the local demo server is running.'); }
  }
  function failedXhr() {
    const request = new XMLHttpRequest();
    request.open('GET', '/api/fail-xhr');
    request.addEventListener('loadend', () => setStatus(`XHR completed with HTTP ${request.status}. Expected: 502.`));
    request.send();
  }
  function brokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmits((count) => count + 1);
    setStatus('Broken form reproduced: submit did not save the order. No field values were sent.');
  }
  return <main className="standalone"><header><div className="brand"><Mark />ReproKit <span className="muted">/ Controlled demo</span></div><a href="http://127.0.0.1:5173/">Local workspace ↗</a></header><h1>Deliberately broken</h1><p>Deterministic failures for verifying future web capture.</p><div className="notice"><strong>Synthetic data only</strong><span>Nothing starts recording automatically. Errors are intentional and isolated from the dashboard and extension.</span></div>
    <div className="demo-grid"><section className="demo-panel"><h2>Diagnostic failures</h2><p>Each action triggers a real browser failure. HTTP endpoints are served locally.</p><ul className="failure-list"><li><div><h3>JavaScript exception</h3><p>Uncaught error in a timer.</p></div><button className="button" data-testid="throw-error" onClick={exception}>Throw error</button></li><li><div><h3>Promise rejection</h3><p>Rejected without a catch handler.</p></div><button className="button" data-testid="reject-promise" onClick={rejection}>Reject promise</button></li><li><div><h3>Failed fetch</h3><p><code>GET /api/fail-fetch → 503</code></p></div><button className="button" data-testid="fail-fetch" onClick={() => void failedFetch()}>Fail fetch</button></li><li><div><h3>Failed XHR</h3><p><code>GET /api/fail-xhr → 502</code></p></div><button className="button" data-testid="fail-xhr" onClick={failedXhr}>Fail XHR</button></li></ul><div className="sensitive-region rr-block" data-reprokit-mask><h3>Explicitly masked region</h3><p>Customer: SYNTHETIC_REGION_SECRET_42</p><p>Account: SYNTHETIC_ACCOUNT_937</p></div><p>Ordinary sensitive text: SYNTHETIC_TEXT_SECRET_13</p><a href="?token=SYNTHETIC_QUERY_SECRET_22#SYNTHETIC_FRAGMENT_SECRET_23" data-customer="SYNTHETIC_ATTRIBUTE_SECRET_17">Sensitive URL and attribute fixture</a></section>
    <section className="demo-panel"><h2>Broken checkout form</h2><p>Submit should save an order. This fixture deliberately leaves it unsaved.</p><form onSubmit={brokenSubmit}><label htmlFor="email">Email</label><input id="email" data-testid="checkout-email" name="email" type="email" autoComplete="off" defaultValue="synthetic-person@example.invalid" /><label htmlFor="password">Password</label><input id="password" data-testid="checkout-password" name="password" type="password" autoComplete="off" defaultValue="SYNTHETIC_PASSWORD_88" /><label htmlFor="notes">Order notes</label><textarea id="notes" data-testid="checkout-notes" defaultValue="SYNTHETIC_TEXTAREA_SECRET_61" /><label id="editable-label">Editable delivery instructions</label><div role="textbox" aria-labelledby="editable-label" contentEditable suppressContentEditableWarning>SYNTHETIC_EDITABLE_SECRET_71</div><button className="button primary" data-testid="submit-order" type="submit">Submit order</button><p data-testid="order-state">Order: unsaved · Submit attempts: {submits}</p></form></section></div>
    <div className="demo-status" role="status">{status}</div><footer className="sheet-footer"><span>These sample values must be absent from future serialized recordings.</span><span>Explicit start required</span></footer></main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
