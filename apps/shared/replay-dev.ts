import { build, type Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function replayDevAssets(): Plugin {
  return { name: 'reprokit-replay-dev-assets', async configureServer(server) {
    // shortcut: isolated dev assets rebuild at server start; add watching when replay work needs hot reload.
    await build({ root: server.config.root, configFile: fileURLToPath(new URL('./vite.replay.config.ts', import.meta.url)), logLevel: 'error' });
    const types: Record<string, string> = { '/replay.html': 'text/html; charset=utf-8', '/replay.js': 'application/javascript; charset=utf-8', '/replay.css': 'text/css; charset=utf-8' };
    server.middlewares.use((request, response, next) => {
      const path = request.url?.split('?')[0] ?? '';
      if (!types[path]) return next();
      void readFile(join(server.config.root, 'dist', path.slice(1))).then((data) => {
        response.writeHead(200, { 'Content-Type': types[path]!, 'Cache-Control': 'no-store' }); response.end(data);
      }).catch(() => { response.writeHead(503); response.end('Replay assets unavailable. Restart the development server.'); });
    });
  } };
}
