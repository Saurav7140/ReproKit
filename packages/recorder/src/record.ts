import { record } from '@rrweb/record';
import { MASK, REPLAY_LIMITS, SAFE_TAGS, STYLE_PROPERTIES, sanitizeStyle, sanitizeReplayEvent, sanitizeUrl, type SafeNode } from '@reprokit/core/privacy';
import { errorSchema, requestSchema, type ReplayEvent } from '@reprokit/core';
import type { CapturePacket, EndReason } from './protocol';
import { captureLocator } from './locators';

export function startWebRecording(options: {
  sessionId: string; startedAt: number; emit: (packet: CapturePacket) => void; end: (reason: EndReason) => void;
}) {
  if(document.querySelector('[data-reprokit-recording]'))throw new Error('Another recording is already active');
  let active = true;
  let stopRrweb: (() => void) | undefined;
  let windowStart = performance.now();
  let diagnostics = 0;
  const atMs = () => Math.max(0, Math.min(300_000, Date.now() - options.startedAt));
  const ownSelector = '[data-reprokit-ui]';
  const blocked = '[data-reprokit-mask], .rr-block, [contenteditable], iframe, canvas, video, audio, object, embed, script, style, link, meta, svg, img';
  const host = document.createElement('div');
  host.setAttribute('data-reprokit-ui', '');
  host.setAttribute('data-reprokit-recording', '');
  host.setAttribute('data-reprokit-mask', '');
  const shadow = host.attachShadow({ mode: 'closed' });
  Object.assign(host.style, { all: 'initial', position: 'fixed', top: '12px', right: '12px', zIndex: '2147483647', display: 'block' });
  const panel = document.createElement('div');
  Object.assign(panel.style, { font: '14px/1.5 system-ui,sans-serif', color: '#fff', background: '#831c1e', padding: '10px 12px', borderRadius: '6px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', maxWidth: 'calc(100vw - 24px)' });
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'ReproKit recording controls');
  const label = document.createElement('strong');
  label.textContent = 'ReproKit · RECORDING';
  panel.append(label);
  for (const [text, reason] of [['Stop', 'stopped'], ['Discard', 'discarded']] as const) {
    const button = document.createElement('button');
    button.textContent = text;
    Object.assign(button.style, { font: 'inherit', color: '#131416', background: '#fff', padding: '5px 10px', border: '1px solid #fff', borderRadius: '4px', cursor: 'pointer' });
    button.addEventListener('click', (event) => { if (event.isTrusted) options.end(reason); });
    panel.append(button);
  }
  shadow.append(panel);
  document.documentElement.append(host);

  const emit = (packet: CapturePacket) => { if (active) options.emit(packet); };
  const presentation = new Map<number, string>();
  let styleTimer: ReturnType<typeof setTimeout> | undefined;
  function readStyle(id: number): string | null {
    const element = record.mirror.getNode(id);
    if (!(element instanceof Element) || !element.isConnected || !(SAFE_TAGS as readonly string[]).includes(element.localName) || element.closest(`${blocked}, ${ownSelector}`)) return null;
    const computed = getComputedStyle(element);
    // Use generic local fonts; original font names and font resources never enter the report.
    const family = /mono|courier|consolas/i.test(computed.fontFamily) ? 'monospace' : !/sans/i.test(computed.fontFamily) && /serif|times|georgia/i.test(computed.fontFamily) ? 'serif' : 'sans-serif';
    return sanitizeStyle(STYLE_PROPERTIES.map((property) => `${property}:${property === 'font-family' ? family : computed.getPropertyValue(property)}`).join(';'));
  }
  function decorate(event: ReplayEvent) {
    if (event.type === 2) presentation.clear();
    const nodes: SafeNode[] = event.type === 2 ? [event.data.node] : event.type === 3 && event.data.source === 0 ? event.data.adds.map((entry) => entry.node) : [];
    while (nodes.length) {
      const node = nodes.pop()!;
      if (node.type === 2 && node.attributes) {
        delete node.attributes.style;
        const style = readStyle(node.id);
        if (style !== null) { node.attributes.style = style; presentation.set(node.id, style); }
      }
      nodes.push(...node.childNodes ?? []);
    }
    if (event.type === 3 && event.data.source === 0) {
      for (const entry of event.data.attributes) {
        delete entry.attributes.style;
        const style = readStyle(entry.id);
        if (style !== null) { entry.attributes.style = style; presentation.set(entry.id, style); }
      }
    }
    if (presentation.size > REPLAY_LIMITS.nodes) throw new Error('Presentation node limit');
  }
  function sendReplay(event: ReplayEvent) {
    if (new TextEncoder().encode(JSON.stringify(event)).byteLength > REPLAY_LIMITS.eventBytes) throw new Error('Presentation byte limit');
    emit({ kind: 'replay', event });
  }
  function refreshStyles() {
    clearTimeout(styleTimer); styleTimer = undefined;
    if (!active) return;
    try {
      const attributes: { id: number; attributes: { style: string } }[] = [];
      for (const [id, previous] of presentation) {
        const style = readStyle(id);
        if (style === null) presentation.delete(id);
        else if (style !== previous) { attributes.push({ id, attributes: { style } }); presentation.set(id, style); }
      }
      if (attributes.length) sendReplay({ type: 3, timestamp: Date.now(), data: { source: 0, attributes, texts: [], adds: [], removes: [] } });
    } catch { options.end('evidence-limit'); }
  }
  const action = (event: Event) => {
    const original = event.composedPath().find((entry) => entry instanceof Element) as Element | undefined;
    if (!event.isTrusted || !original || original.closest(`${blocked}, ${ownSelector}`)) return;
    const element = event.type === 'click' ? original.closest('button,a[href],input,textarea,select,[role],[data-testid]') ?? original : original;
    const tag = element.tagName.toLowerCase();
    const inputKind = element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement && ['text','email','tel','url','search','number'].includes(element.type) ? 'text' : element instanceof HTMLInputElement && element.type === 'password' ? 'password' : 'other';
    emit({ kind: 'action', event: { atMs: atMs(), type: event.type === 'input' ? 'input' : 'click', target: (SAFE_TAGS as readonly string[]).includes(tag) ? tag : 'element', locator: captureLocator(element), valueMasked: true, ...(event.type === 'input' ? { inputKind } : {}) } });
  };
  const navigation = (event: Event) => {
    if ((event as Event & { destination?: { sameDocument?: boolean } }).destination?.sameDocument) {
      emit({ kind: 'action', event: { atMs: atMs(), type: 'navigation', target: 'page', locator: { kind: 'unavailable', value: '' }, valueMasked: true } });
    }
  };
  const bridge = (event: MessageEvent) => {
    if (!active || event.source !== window || event.origin !== location.origin) return;
    const value = event.data;
    if (!value || value.channel !== 'reprokit-diagnostic-v2' || value.sessionId !== options.sessionId) return;
    if (performance.now() - windowStart > 1_000) { windowStart = performance.now(); diagnostics = 0; }
    if (++diagnostics > 50) return;
    if (!value.event || typeof value.event !== 'object' || Array.isArray(value.event)) return;
    const fields = Object.values(value.event) as unknown[];
    if (fields.length > 7 || fields.some((field) => field !== undefined && typeof field !== 'number' && (typeof field !== 'string' || field.length > 8_000))) return;
    if (fields.reduce<number>((size, field) => size + (typeof field === 'string' ? field.length : 8), 0) > 16_384) return;
    // Page messages are untrusted; replace all text again before the extension port.
    if (value.kind === 'error') {
      const parsed = errorSchema.safeParse(value.event);
      if (parsed.success) emit({ kind: 'error', event: { atMs: atMs(), type: parsed.data.type, message: parsed.data.type === 'exception' ? 'JavaScript exception (message masked)' : 'Unhandled promise rejection (reason masked)', ...(parsed.data.stack ? { stack: parsed.data.stack.match(/^at \[masked\]:\d{1,7}:\d{1,7}$/)?.[0] ?? 'at [masked]' } : {}) } });
    } else if (value.kind === 'request') {
      const parsed = requestSchema.safeParse(value.event);
      if (parsed.success && parsed.data.outcome === 'http-error') emit({ kind: 'request', event: { ...parsed.data, atMs: atMs(), method: 'OTHER', url: sanitizeUrl(parsed.data.url) } });
    }
  };
  const pagehide = () => options.end('navigation');
  const navigationTarget = (window as typeof window & { navigation?: EventTarget }).navigation;
  document.addEventListener('click', action, true);
  document.addEventListener('input', action, true);
  window.addEventListener('message', bridge);
  window.addEventListener('pagehide', pagehide, { once: true });
  navigationTarget?.addEventListener('navigate', navigation);
  const timer = window.setTimeout(() => options.end('duration-limit'), Math.max(0, 300_000 - atMs()));
  const indicatorTimer = window.setInterval(() => {
    const rect = host.getBoundingClientRect();
    const style = getComputedStyle(host);
    if (!host.isConnected || rect.width === 0 || rect.height === 0 || style.visibility === 'hidden' || style.opacity === '0' || rect.right <= 0 || rect.left >= innerWidth || rect.bottom <= 0 || rect.top >= innerHeight) options.end('indicator-removed');
  }, 500);
  function stop() {
    if (!active) return;
    refreshStyles();
    active = false;
    stopRrweb?.();
    clearTimeout(timer);
    clearInterval(indicatorTimer);
    clearTimeout(styleTimer); presentation.clear();
    document.removeEventListener('click', action, true);
    document.removeEventListener('input', action, true);
    window.removeEventListener('message', bridge);
    window.removeEventListener('pagehide', pagehide);
    navigationTarget?.removeEventListener('navigate', navigation);
    window.postMessage({ channel: 'reprokit-stop-v2', sessionId: options.sessionId }, location.origin);
    host.remove();
  }
  try {
    stopRrweb = record({
      emit(event) {
        if (!active) return;
        try {
          const clean = sanitizeReplayEvent(event) as ReplayEvent | null;
          if (clean) { decorate(clean); sendReplay(clean); }
          // Coalesce cascade/layout changes, including descendants affected by class or stylesheet changes.
          if (!styleTimer) styleTimer = setTimeout(refreshStyles, 100);
        } catch { options.end('evidence-limit'); }
      },
      maskAllInputs: true, maskTextSelector: '*', maskInputFn: () => MASK, maskTextFn: () => MASK,
      blockSelector: `${blocked}, ${ownSelector}`, ignoreSelector: `${blocked}, ${ownSelector}`,
      inlineStylesheet: false, inlineImages: false, recordCanvas: false, collectFonts: false, recordCrossOriginIframes: false,
      keepIframeSrcFn: () => false, slimDOMOptions: 'all', sampling: { mousemove: false, scroll: 150, input: 'last' },
    });
    if (!stopRrweb) throw new Error('Recorder did not start');
  } catch { stop(); throw new Error('DOM capture could not start'); }
  return stop;
}
