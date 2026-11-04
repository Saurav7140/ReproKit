import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {thirdPartyNotices} from '../shared/third-party-notices.ts';
import { fileURLToPath } from 'node:url';
import { replayDevAssets } from '../shared/replay-dev.ts';
import { hostedConfiguration, dashboardReportUrl } from '../../packages/core/src/hosted.ts';
import manifest from './public/manifest.json' with { type: 'json' };
export default defineConfig(({mode}) => {
  const local=loadEnv(mode,fileURLToPath(new URL('.',import.meta.url)),'VITE_');
  const dashboard=loadEnv(mode,fileURLToPath(new URL('../dashboard',import.meta.url)),'VITE_');
  const env=local.VITE_SUPABASE_URL || local.VITE_SUPABASE_PUBLISHABLE_KEY ? local : dashboard;
  const config=hostedConfiguration(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const origin=local.VITE_DASHBOARD_ORIGIN || 'http://127.0.0.1:5173';
  dashboardReportUrl(origin,'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
  return {
    base:'./',publicDir:false,
    define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(config?.url??''),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify(config?.key??''),'import.meta.env.VITE_DASHBOARD_ORIGIN':JSON.stringify(origin)},
    plugins:[react(),replayDevAssets(),thirdPartyNotices(),{name:'reprokit-extension-manifest',generateBundle(){this.emitFile({type:'asset',fileName:'manifest.json',source:JSON.stringify({...manifest,content_security_policy:{extension_pages:manifest.content_security_policy.extension_pages.replace("connect-src 'none'",`connect-src ${config?.url??"'none'"}`)}},null,2)});}}],
    build:{license:{fileName:'licenses-ui.md'},rollupOptions:{input:{popup:fileURLToPath(new URL('index.html',import.meta.url)),review:fileURLToPath(new URL('review.html',import.meta.url))}}},
  };
});
