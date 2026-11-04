import { startDiagnostics } from './diagnostics';
import { PAGE_KEY } from './protocol';

type PageApi = { start: (sessionId: string, startedAt: number) => void; stop: () => void };
const scope = window as unknown as Record<string, PageApi | undefined>;
if (!scope[PAGE_KEY]) {
  let cleanup = () => {};
  scope[PAGE_KEY] = {
    stop: () => cleanup(),
    start(sessionId, startedAt) {
      cleanup();
      const stop = startDiagnostics((packet) => window.postMessage({ channel: 'reprokit-diagnostic-v2', sessionId, ...packet }, location.origin), startedAt);
      const control = (event: MessageEvent) => {
        if (event.source === window && event.origin === location.origin && event.data?.channel === 'reprokit-stop-v2' && event.data?.sessionId === sessionId) cleanup();
      };
      const timer = window.setTimeout(() => cleanup(), 300_000);
      cleanup = () => { stop(); clearTimeout(timer); window.removeEventListener('message', control); window.removeEventListener('pagehide', cleanup); };
      window.addEventListener('message', control);
      window.addEventListener('pagehide', cleanup, { once: true });
    },
  };
}
