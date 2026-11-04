import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ build: {
  license:{fileName:'licenses-validator.md'},
  outDir: fileURLToPath(new URL('./functions/_shared', import.meta.url)), emptyOutDir: false,
  lib: { entry: fileURLToPath(new URL('./validation-entry.ts', import.meta.url)), formats: ['es'], fileName: () => 'report.js' },
} });
