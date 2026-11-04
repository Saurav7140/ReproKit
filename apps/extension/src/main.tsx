import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CapturePage } from './CapturePage';
import { Mark } from '../../shared/Mark';
import { CaptureController } from './controller';
import '../../shared/style.css';

const isReview = window.location.pathname.endsWith('/review.html');
const extension = typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
const controller = isReview && extension ? new CaptureController() : null;

function Popup() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<{ status: string; controllerTabId: number } | null>(null);
  useEffect(() => {
    if (extension) void chrome.runtime.sendMessage({ type: 'get-capture' }).then((value) => {
      if (value?.controllerTabId !== undefined && value.status !== 'discarded') setExisting(value);
    }).catch(() => {});
  }, []);
  async function start() {
    setBusy(true); setError('');
    try {
      if (!extension) throw new Error('extension-required');
      if (existing) { await chrome.tabs.update(existing.controllerTabId, { active: true }); return; }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('missing-tab');
      await chrome.tabs.create({ url: chrome.runtime.getURL(`review.html?tab=${tab.id}&start=1`), active: false });
      window.close();
    } catch { setError('Open the installed ReproKit action on a supported web tab. The HTTP preview cannot access browser tabs.'); }
    finally { setBusy(false); }
  }
  return <main className="popup"><div className="brand"><Mark />ReproKit</div>
    <h1 className={existing?.status === 'recording' ? 'recording-text' : ''}>{existing?.status === 'recording' ? 'Recording selected tab' : existing ? 'Local capture available' : 'Not recording'}</h1>
    <p>Start captures this tab only. Text, form values and error messages are masked. Short unique test IDs and control roles may be retained for test drafts; review them before sharing.</p>
    <p className="fine-print">Keep the capture page open. Stop or discard at any time. Capture stays local until you explicitly upload a reviewed report. Automatic masking cannot recognize every sensitive application value.</p>
    <button className="button primary" disabled={busy} onClick={() => void start()}>{busy ? 'Opening…' : existing ? 'Open capture page' : 'Start recording this tab'}</button>
    <a className="button popup-reports" href={extension ? chrome.runtime.getURL('review.html') : './review.html'} target="_blank" rel="noreferrer">Open local reports</a>
    {error && <p role="alert" className="error">{error}</p>}
    <p className="fine-print">Up to 5 minutes · 10,000 events · 5 MiB. Requires temporary access through this toolbar action.</p>
  </main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode>{isReview ? controller ? <CapturePage capture={controller} /> : <main className="standalone"><h1>Install the extension to capture</h1><p>Browser permissions and local capture require the unpacked Chromium extension.</p></main> : <Popup />}</StrictMode>);
