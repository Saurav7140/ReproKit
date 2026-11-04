import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, timeout: 30_000,
  use: { browserName: 'chromium', headless: true, viewport: { width: 1440, height: 900 }, trace: 'retain-on-failure' },
  reporter: 'list',
  webServer: [
    { command: 'npm run dev -w @reprokit/sdk-demo -- --port 5179', url: 'http://127.0.0.1:5179/', reuseExistingServer: false, timeout: 30_000,
      env: { VITE_REPROKIT_PUBLIC_ENDPOINT:'https://public-ui-test.supabase.co/functions/v1/reprokit-public',VITE_REPROKIT_PROJECT_KEY:'11111111-1111-4111-8111-111111111111' } },
    { command: 'npm run preview -w @reprokit/sdk-demo', url: 'http://127.0.0.1:5176/', reuseExistingServer: !process.env.CI, timeout: 30_000 },
    { command: 'npm run preview -w @reprokit/dashboard', url: 'http://127.0.0.1:5173/', reuseExistingServer: !process.env.CI, timeout: 30_000 },
    { command: 'npm run preview -w @reprokit/demo', url: 'http://127.0.0.1:5174/', reuseExistingServer: !process.env.CI, timeout: 30_000 },
    { command: 'npm run dev -w @reprokit/dashboard -- --port 5177', url: 'http://127.0.0.1:5177/', reuseExistingServer: false, timeout: 30_000,
      env: { VITE_SUPABASE_URL: 'https://hosted-ui-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_ui_fixture_only' } },
    { command: 'npm run preview -w @reprokit/demo -- --port 5178', url: 'http://127.0.0.1:5178/', reuseExistingServer: false, timeout: 30_000 },
  ],
});
