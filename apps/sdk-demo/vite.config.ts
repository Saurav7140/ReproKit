import { defineConfig } from 'vite';
import demo from '../demo/vite.config.ts';
import { replayDevAssets } from '../shared/replay-dev.ts';
export default defineConfig({...demo,plugins:[demo.plugins,replayDevAssets()]});
