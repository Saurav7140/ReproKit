import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => ({
  publicDir: false,
  build: {
    license:{fileName:mode==='page'?'licenses-page.md':'licenses-content.md'},
    emptyOutDir: false,
    lib: { entry: fileURLToPath(new URL(mode === 'page' ? '../../packages/recorder/src/page.ts' : './src/content.ts', import.meta.url)), name: 'ReproKitCapture', formats: ['iife'], fileName: () => mode === 'page' ? 'page.js' : 'content.js' },
  },
}));
