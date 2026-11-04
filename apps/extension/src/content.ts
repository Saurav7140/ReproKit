import { startWebRecording } from '../../../packages/recorder/src/record';
import { CONTENT_KEY, type EndReason } from '@reprokit/recorder';
import { sanitizeUrl } from '@reprokit/core/privacy';
import { LIMITS } from '@reprokit/core';

const scope = globalThis as unknown as Record<string, boolean>;
if (!scope[CONTENT_KEY]) {
  scope[CONTENT_KEY] = true;
  let occupied = false;
  chrome.runtime.onConnect.addListener((port) => {
    if (port.sender?.id !== chrome.runtime.id || !port.sender.url?.startsWith(chrome.runtime.getURL('review.html')) || !/^reprokit:[0-9a-f-]{36}$/.test(port.name) || occupied) { port.disconnect(); return; }
    let stop: (() => void) | undefined;
    let ended = false;
    let ending = false;
    let sentBytes = 4_096;
    let sentEvents = 2;
    const end = (reason: EndReason) => {
      if (ended || ending) return;
      ending = true;
      stop?.();
      ended = true;
      occupied = false;
      try { port.postMessage({ kind: 'ended', reason }); } catch { /* Controller already closed. */ }
      port.disconnect();
    };
    port.onDisconnect.addListener(() => end('controller-closed'));
    port.onMessage.addListener((message: unknown) => {
      const command = message as { type?: string; startedAt?: number };
      if (command?.type === 'stop') { end('stopped'); return; }
      if (command?.type === 'discard') { end('discarded'); return; }
      if (command?.type !== 'start' || stop || ended || typeof command.startedAt !== 'number' || Math.abs(Date.now() - command.startedAt) > 10_000) return;
      if (document.contentType !== 'text/html' || window !== window.top) { end('capture-error'); return; }
      occupied = true;
      const ua = navigator.userAgent;
      const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac OS') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'unknown';
      const majorVersion = Number(/(?:Chrome|Chromium)\/(\d+)/.exec(ua)?.[1] ?? 1);
      port.postMessage({ kind: 'ready', page: { url: sanitizeUrl(location.href) }, environment: { os, browser: { family: 'Chromium', majorVersion }, viewport: { width: Math.max(1, Math.min(16_384, innerWidth)), height: Math.max(1, Math.min(16_384, innerHeight)) } }, requestsAvailable: 'responseStatus' in PerformanceResourceTiming.prototype });
      try {
        stop = startWebRecording({
          sessionId: port.name.slice('reprokit:'.length), startedAt: command.startedAt,
          emit: (packet) => {
            if (ended) return;
            const size = new TextEncoder().encode(JSON.stringify(packet)).byteLength;
            const count = packet.kind === 'replay' ? 1 : 2;
            if (sentEvents + count > LIMITS.events) { end('event-limit'); return; }
            if (sentBytes + size > LIMITS.bytes) { end('byte-limit'); return; }
            sentEvents += count; sentBytes += size;
            try { port.postMessage(packet); } catch { end('connection-lost'); }
          }, end,
        });
        if (ended) stop();
      } catch { end('capture-error'); }
    });
  });
}
