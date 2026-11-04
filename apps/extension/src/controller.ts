import { LIMITS, reportSchema, sanitizeUrl, type Report } from '@reprokit/core';
import { CaptureBuffer } from '../../../packages/recorder/src/buffer';
import { END_REASONS, PAGE_KEY, type EndReason } from '@reprokit/recorder';

export type CaptureView = {
  status: 'idle' | 'starting' | 'recording' | 'stopped' | 'discarded' | 'error';
  reason?: EndReason; error?: string; events: number; bytes: number; elapsed: number; report?: Report;
};
export function supportedTab(tab: { url?: string; incognito?: boolean }): boolean {
  if (!tab.url || tab.incognito) return false;
  try {
    const url = new URL(tab.url);
    return ['http:', 'https:'].includes(url.protocol)
      && !['chromewebstore.google.com', 'microsoftedge.microsoft.com'].includes(url.hostname)
      && !(url.hostname === 'chrome.google.com' && url.pathname.startsWith('/webstore'))
      && !['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:5175', 'http://localhost:5175'].includes(url.origin);
  } catch { return false; }
}

export class CaptureController {
  private view: CaptureView = { status: 'idle', events: 0, bytes: 0, elapsed: 0 };
  private listeners = new Set<() => void>();
  private buffer?: CaptureBuffer;
  private port?: chrome.runtime.Port;
  private tabId?: number;
  private documentId?: string;
  private controllerTabId?: number;
  private started = false;
  private ending = false;
  private drain: (() => void) | undefined;
  private ticker?: number;
  private deadline?: number;
  private releaseLock?: () => void;
  subscribe = (callback: () => void) => { this.listeners.add(callback); return () => { this.listeners.delete(callback); }; };
  snapshot = () => this.view;
  constructor() {
    chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
      if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL('index.html'))) return;
      if ((message as { type?: string })?.type === 'get-capture' && this.controllerTabId !== undefined && this.view.status !== 'idle' && this.view.status !== 'discarded') reply({ status: this.view.status, tabId: this.tabId, controllerTabId: this.controllerTabId });
    });
    chrome.tabs.onRemoved.addListener((id) => { if (id === this.tabId) void this.finish('tab-closed'); });
    window.addEventListener('pagehide', () => { this.port?.disconnect(); this.releaseLock?.(); });
  }
  private publish(change: Partial<CaptureView>) {
    this.view = { ...this.view, ...change, events: this.buffer?.eventCount ?? 0, bytes: this.buffer?.byteSize ?? 0, elapsed: this.buffer ? Math.min(LIMITS.durationMs, Math.max(0, Date.now() - this.buffer.startedAt)) : 0 };
    this.listeners.forEach((listener) => listener());
  }
  begin(tabId: number) {
    if (this.started) return;
    this.started = true;
    void navigator.locks.request('reprokit-local-capture', { ifAvailable: true }, async (lock) => {
      if (!lock) { this.publish({ status: 'error', error: 'Another capture page already owns a report. Open that page, or close it before starting again.' }); return; }
      const held = new Promise<void>((resolve) => { this.releaseLock = resolve; });
      try { await this.start(tabId); }
      catch {
        if (!this.ending) {
          await this.finish('capture-error');
          this.publish({ status: 'error', error: 'Capture could not start. Use the ReproKit toolbar action on an authorized HTML tab. Browser pages, stores, PDFs, incognito and ReproKit itself are unsupported.' });
        }
      }
      await held;
    });
  }
  private async start(tabId: number) {
    const tab = await chrome.tabs.get(tabId);
    this.controllerTabId = (await chrome.tabs.getCurrent())?.id;
    if (!supportedTab(tab)) throw new Error('Unsupported tab');
    this.tabId = tabId;
    this.buffer = new CaptureBuffer();
    this.publish({ status: 'starting' });
    const injected = await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['content.js'], world: 'ISOLATED' });
    if (this.ending) return;
    this.documentId = injected[0]?.documentId;
    if (!this.documentId) throw new Error('Missing document');
    const port = chrome.tabs.connect(tabId, { name: `reprokit:${this.buffer.report.id}`, documentId: this.documentId });
    this.port = port;
    await new Promise<void>((resolve, reject) => {
      let ready = false;
      const timeout = window.setTimeout(() => reject(new Error('Capture handshake timed out')), 10_000);
      port.onDisconnect.addListener(() => {
        void chrome.runtime.lastError;
        clearTimeout(timeout);
        this.drain?.();
        if (!ready) reject(new Error('Capture connection failed'));
        if (!this.ending) void this.finish('connection-lost');
      });
      port.onMessage.addListener((message: unknown) => {
        if (!this.buffer) return;
        const packet = message as { kind?: string; reason?: EndReason; environment?: unknown; page?: { url?: unknown }; requestsAvailable?: boolean } | null;
        if (this.ending) {
          if (packet?.kind === 'ended') this.drain?.();
          else if (this.drain && packet?.kind !== 'ready') this.buffer.append(message);
          return;
        }
        if (packet?.kind === 'ready' && !ready) {
          const environment = reportSchema.shape.environment.safeParse(packet.environment);
          if (!environment.success || typeof packet.page?.url !== 'string' || packet.page.url.length > 2_048) { reject(new Error('Invalid metadata')); return; }
          this.buffer.report.environment = environment.data;
          if (this.buffer.report.evidence.kind === 'web') this.buffer.report.evidence.page = { url: sanitizeUrl(packet.page.url) };
          this.buffer.report.capabilities.requests = packet.requestsAvailable === true ? 'available' : 'unavailable';
          ready = true; clearTimeout(timeout); resolve();
        } else if (packet?.kind === 'ended' && packet.reason && END_REASONS.includes(packet.reason)) void this.finish(packet.reason);
        else { const reason = this.buffer.append(message); if (reason) void this.finish(reason); }
      });
      port.postMessage({ type: 'start', startedAt: this.buffer!.startedAt });
    });
    if (this.ending) return;
    const target = { tabId, documentIds: [this.documentId] };
    await chrome.scripting.executeScript({ target, files: ['page.js'], world: 'MAIN' });
    if (this.ending) return;
    await chrome.scripting.executeScript({ target, world: 'MAIN', func: (key: string, session: string, startedAt: number) => {
      const api = (globalThis as unknown as Record<string, { start: (id: string, time: number) => void }>)[key];
      if (!api) throw new Error('Diagnostic observer missing');
      api.start(session, startedAt);
    }, args: [PAGE_KEY, this.buffer.report.id, this.buffer.startedAt] });
    if (this.ending) return;
    this.publish({ status: 'recording' });
    this.ticker = window.setInterval(() => this.publish({}), 500);
    this.deadline = window.setTimeout(() => void this.finish('duration-limit'), Math.max(0, LIMITS.durationMs - (Date.now() - this.buffer.startedAt)));
  }
  async finish(reason: EndReason = 'stopped') {
    if (this.ending) return;
    this.ending = true;
    clearInterval(this.ticker); clearTimeout(this.deadline);
    const port = this.port;
    if (port && reason === 'stopped') {
      // Drain bounded final layout updates before disconnecting the recorder's port.
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => this.drain?.(), 1000);
        this.drain = () => { clearTimeout(timer); this.drain = undefined; resolve(); };
        try { port.postMessage({ type: 'stop' }); } catch { this.drain(); }
      });
    } else {
      try { port?.postMessage({ type: reason === 'discarded' ? 'discard' : 'stop' }); } catch { /* Tab may have navigated. */ }
    }
    this.port?.disconnect();
    if (this.tabId !== undefined && this.documentId) {
      try {
        await chrome.scripting.executeScript({ target: { tabId: this.tabId, documentIds: [this.documentId] }, world: 'MAIN', func: (key: string) => {
          (globalThis as unknown as Record<string, { stop?: () => void }>)[key]?.stop?.();
        }, args: [PAGE_KEY] });
      } catch { /* The old document may already be gone. */ }
    }
    if (reason === 'discarded') {
      this.buffer = undefined; this.publish({ status: 'discarded', reason, report: undefined }); this.releaseLock?.();
    } else if (this.buffer) {
      try { const report = this.buffer.finish(reason); this.publish({ status: 'stopped', reason, report }); }
      catch { this.publish({ status: 'error', reason, error: 'The captured payload failed validation. Discard it and try a shorter recording.' }); }
    }
  }
  discard() {
    if (!this.ending) { void this.finish('discarded'); return; }
    this.buffer = undefined; this.publish({ status: 'discarded', report: undefined, error: undefined, reason: 'discarded' }); this.releaseLock?.();
  }
  releaseBuffer() {
    if (!this.ending) return;
    this.buffer = undefined;
    this.publish({ report: undefined });
  }
}
