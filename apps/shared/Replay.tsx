import { useEffect, useRef, useState } from 'react';
import { LIMITS, type Report } from '@reprokit/core';
import replayDocument from './replay.html?raw';

type Playback = { status: 'loading' | 'paused' | 'playing' | 'error'; current: number; duration: number };
export function Replay({ report }: { report: Report }) {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const token = useRef('');
  const [state, setState] = useState<Playback>({ status: 'loading', current: 0, duration: 0 });
  useEffect(() => {
    const element = document.createElement('iframe');
    const script = new URL('./replay.js', location.href);
    const css = new URL('./replay.css', location.href);
    const html = replayDocument.replaceAll('./replay.js', script.href).replaceAll('./replay.css', css.href).replaceAll("'self'", script.origin);
    element.src = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    element.title = 'Isolated DOM session replay'; element.className = 'replay-frame';
    // A data document keeps a unique opaque origin while rrweb can access its script-disabled child.
    element.setAttribute('sandbox', 'allow-scripts allow-same-origin'); element.referrerPolicy = 'no-referrer'; element.tabIndex = -1;
    token.current = crypto.randomUUID(); frame.current = element;
    setState({ status: 'loading', current: 0, duration: 0 });
    const timer = window.setTimeout(() => setState((old) => ({ ...old, status: 'error' })), 10_000);
    const receive = (event: MessageEvent) => {
      if (event.source !== element.contentWindow || !event.data || event.data.channel !== 'reprokit-replay-v1') return;
      if (event.origin !== 'null') { setState((old) => ({ ...old, status: 'error' })); return; }
      const message = event.data as { type?: string; session?: string; playing?: boolean; duration?: number; current?: number };
      if (message.type === 'ready') {
        element.contentWindow?.postMessage({ channel: 'reprokit-replay-v1', type: 'load', session: token.current, report: JSON.stringify(report) }, '*');
      } else if (message.session === token.current) {
        if (message.type === 'error') { clearTimeout(timer); setState((old) => ({ ...old, status: 'error' })); }
        else if (message.type === 'state' && typeof message.duration === 'number' && Number.isFinite(message.duration) && message.duration >= 0 && message.duration <= LIMITS.durationMs && typeof message.current === 'number' && Number.isFinite(message.current) && message.current >= 0 && message.current <= message.duration) {
          clearTimeout(timer); setState({ status: message.playing ? 'playing' : 'paused', duration: message.duration, current: message.current });
        }
      }
    };
    window.addEventListener('message', receive); container.current!.append(element);
    return () => { clearTimeout(timer); window.removeEventListener('message', receive); element.remove(); frame.current = null; };
  }, [report]);
  function command(action: 'play' | 'pause' | 'seek', atMs = state.current) {
    frame.current?.contentWindow?.postMessage({ channel: 'reprokit-replay-v1', type: 'command', session: token.current, action, atMs }, '*');
  }
  const disabled = state.status === 'loading' || state.status === 'error';
  return <section aria-label="DOM replay"><div className="replay-controls"><button className="button" disabled={disabled || state.duration === 0} onClick={() => command(state.status === 'playing' ? 'pause' : 'play', state.current >= state.duration ? 0 : state.current)}>{state.status === 'playing' ? 'Pause replay' : 'Play replay'}</button><label htmlFor="replay-position">Replay position</label><input id="replay-position" type="range" min="0" max={state.duration || 1} value={Math.round(state.current)} step="1" disabled={disabled} onChange={(event) => command('seek', Number(event.target.value))} /><span className="replay-time" aria-live="off">{(state.current / 1000).toFixed(1)} / {(state.duration / 1000).toFixed(1)} s</span></div>
    <p role="status">{state.status === 'loading' ? 'Loading isolated replay…' : state.status === 'error' ? 'Replay could not load safely. Other report evidence remains available.' : state.status === 'playing' ? 'Replay playing' : 'Replay paused'}</p>
    <div className="replay-surface" ref={container} />
    {report.formatVersion < 3 && <p className="replay-note">This older recording has no captured page styling. Record again with the updated extension to preserve supported layout and colours.</p>}
    <p className="replay-note">Masked DOM replay. Supported layout and colours are retained when captured; original images and fonts are omitted. External assets and network access are blocked. This cannot restore authentication, server state or the original environment.</p>
  </section>;
}
