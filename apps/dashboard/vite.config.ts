import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {thirdPartyNotices} from '../shared/third-party-notices.ts';
import { replayDevAssets } from '../shared/replay-dev.ts';
import { hostedConfiguration } from '../../packages/core/src/hosted.ts';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_');
  hostedConfiguration(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return { plugins: [react(), replayDevAssets(),thirdPartyNotices()],build:{license:{fileName:'licenses-ui.md'}} };
});
