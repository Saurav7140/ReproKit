import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  publicDir: false,
  plugins: [{ name: 'reprokit-replay-document', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'replay.html', source: readFileSync(new URL('./replay.html', import.meta.url), 'utf8') });
  } }],
  build: { license:{fileName:'licenses-replay.md'},emptyOutDir: false, lib: { entry: fileURLToPath(new URL('./replay-frame.ts', import.meta.url)), name: 'ReproKitReplay', formats: ['iife'], fileName: () => 'replay.js', cssFileName: 'replay' } },
});
