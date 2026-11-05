import { Replayer } from '@rrweb/replay';
import '@rrweb/replay/dist/style.css';
import './replay-frame.css';
import { LIMITS, parseReport } from '@reprokit/core';

let player: Replayer | undefined;
let session = '';
let parentOrigin = '*';
let playing = false;
let duration = 0;
let snapshotOffset = 0;
let resize: ResizeObserver | undefined;
const stage = document.getElementById('stage')!;
const send = (type: 'ready' | 'state' | 'error', current = player?.getCurrentTime() ?? 0) => parent.postMessage({ channel: 'reprokit-replay-v1', type, session, playing, duration, current: Math.min(duration, Math.max(0, current)) }, parentOrigin);
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
      const events = [...report.evidence.replay].sort((a, b) => a.timestamp - b.timestamp);
      const start = events[0]!.timestamp;
      const end = events.at(-1)!.timestamp;
      duration = Math.min(LIMITS.durationMs, Math.max(0, end - start));
      snapshotOffset = events.find((event) => event.type === 2)!.timestamp - start;
      // Keep rrweb's delayed finish callback out of seeks to the last captured event.
      const playback = [...events, { type: 1, timestamp: end + 1000, data: {} }];
      player = new Replayer(playback as unknown as ConstructorParameters<typeof Replayer>[0], {
        root: stage, UNSAFE_replayCanvas: false, triggerFocus: false, mouseTail: false, showWarning: false, showDebug: false, loadTimeout: 0,
      });
      if (player.iframe.sandbox.contains('allow-scripts')) throw new Error('Unsafe inner replay frame');
      player.disableInteract();
      player.pause(snapshotOffset + 1);
      player.on('finish', () => { if (playing) { playing = false; send('state', duration); } });
      resize = new ResizeObserver(fit); resize.observe(player.iframe); fit();
      send('state', 0);
    } else if (message.type === 'command' && message.session === session && player) {
      const offset = typeof message.atMs === 'number' && Number.isFinite(message.atMs) ? Math.min(duration, Math.max(0, message.atMs)) : 0;
      if (message.action === 'play') { playing = true; player.play(offset); }
      // Include the selected millisecond; before the first snapshot, restore that initial DOM.
      else if (message.action === 'pause' || message.action === 'seek') { playing = false; player.pause(Math.max(snapshotOffset + 1, offset + 1)); }
      else return;
      send('state', offset);
    }
  } catch { fail(); }
});
window.addEventListener('resize', fit);
window.addEventListener('error', fail);
window.addEventListener('unhandledrejection', fail);
const ticker = window.setInterval(() => {
  if (!player || !playing) return;
  const current = player.getCurrentTime();
  if (current >= duration) { playing = false; player.pause(); send('state', duration); }
  else send('state', current);
}, 200);
window.addEventListener('pagehide', () => { clearInterval(ticker); resize?.disconnect(); player?.destroy(); });
send('ready');
