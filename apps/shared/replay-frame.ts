import { Replayer } from '@rrweb/replay';
import '@rrweb/replay/dist/style.css';
import './replay-frame.css';
import { LIMITS, parseReport } from '@reprokit/core';

let player: Replayer | undefined;
let session = '';
let parentOrigin = '*';
let playing = false;
let duration = 0;
let resize: ResizeObserver | undefined;
const stage = document.getElementById('stage')!;
const send = (type: 'ready' | 'state' | 'error') => parent.postMessage({ channel: 'reprokit-replay-v1', type, session, playing, duration, current: Math.min(duration, Math.max(0, player?.getCurrentTime() ?? 0)) }, parentOrigin);
function fail() {
  playing = false;
  try { player?.pause(); } catch { /* A malformed sequence may be unplayable. */ }
  send('error');
}
function fit() {
  if (!player) return;
  const width = player.iframe.offsetWidth;
  const height = player.iframe.offsetHeight;
  if (width > 0 && height > 0) player.wrapper.style.transform = `scale(${Math.min(innerWidth / width, innerHeight / height, 1)})`;
}
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== parent || !event.data || event.data.channel !== 'reprokit-replay-v1') return;
  const message = event.data as { type?: string; session?: string; report?: string; action?: string; atMs?: number };
  try {
    if (message.type === 'load' && !session && typeof message.session === 'string' && /^[0-9a-f-]{36}$/.test(message.session)) {
      session = message.session; parentOrigin = event.origin;
      if (typeof message.report !== 'string' || message.report.length > LIMITS.bytes) throw new Error('Invalid replay payload');
      const report = parseReport(message.report);
      if (report.evidence.kind !== 'web' || report.capabilities.replay !== 'available' || !report.evidence.replay || report.evidence.replay.length < 2) throw new Error('Replay unavailable');
      // Only the validated, resource-free rrweb subset crosses into the upstream replayer.
      player = new Replayer(report.evidence.replay as unknown as ConstructorParameters<typeof Replayer>[0], {
        root: stage, UNSAFE_replayCanvas: false, triggerFocus: false, mouseTail: false, showWarning: false, showDebug: false, loadTimeout: 0,
      });
      if (player.iframe.sandbox.contains('allow-scripts')) throw new Error('Unsafe inner replay frame');
      player.disableInteract();
      duration = Math.min(LIMITS.durationMs, Math.max(0, player.getMetaData().totalTime));
      player.pause(0);
      player.on('finish', () => { playing = false; send('state'); });
      resize = new ResizeObserver(fit); resize.observe(player.iframe); fit();
      send('state');
    } else if (message.type === 'command' && message.session === session && player) {
      const offset = typeof message.atMs === 'number' && Number.isFinite(message.atMs) ? Math.min(duration, Math.max(0, message.atMs)) : 0;
      if (message.action === 'play') { playing = true; player.play(offset); }
      // rrweb casts seek events strictly before the offset; include the selected millisecond.
      else if (message.action === 'pause' || message.action === 'seek') { playing = false; player.pause(offset + 1); }
      else return;
      send('state');
    }
  } catch { fail(); }
});
window.addEventListener('resize', fit);
window.addEventListener('error', fail);
window.addEventListener('unhandledrejection', fail);
const ticker = window.setInterval(() => { if (player && playing) send('state'); }, 200);
window.addEventListener('pagehide', () => { clearInterval(ticker); resize?.disconnect(); player?.destroy(); });
send('ready');
