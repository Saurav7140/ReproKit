import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {thirdPartyNotices} from '../shared/third-party-notices.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';

function failures(request: IncomingMessage, response: ServerResponse, next: () => void) {
  const path = request.url?.split('?')[0];
  if (path !== '/api/fail-fetch' && path !== '/api/fail-xhr') return next();
  response.writeHead(path === '/api/fail-fetch' ? 503 : 502, {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-ReproKit-Demo': 'intentional-failure',
  });
  response.end(JSON.stringify({ error: 'Intentional local demo failure' }));
}
const demoFailures: Plugin = {
  name: 'reprokit-controlled-failures',
  configureServer(server) { server.middlewares.use(failures); },
  configurePreviewServer(server) { server.middlewares.use(failures); },
};
export default defineConfig({ plugins: [demoFailures, react(),thirdPartyNotices()],build:{license:{fileName:'licenses-ui.md'}} });
