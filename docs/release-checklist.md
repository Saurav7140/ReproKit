# Local release preparation

Phase 8 prepares and verifies local source/builds. It does not publish a site, npm package, extension-store listing or Git repository. [Verification](verification-phase8.md), [limitations](known-limitations.md).

## New developer setup

1. Clone the repository into its own directory. Check that `git rev-parse --show-toplevel` points to that directory before staging or pushing anything.
2. Use Node 22.12+ and npm 10+. From the project root:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run check
npm.cmd run test:browser
```

3. In separate terminals, run `npm.cmd run dev` and `npm.cmd run dev:demo`. Open http://127.0.0.1:5173 and http://127.0.0.1:5174. Use the IP consistently. If a strict port is occupied, stop its known terminal or use the already-running site; do not terminate an unknown process. Product verification also uses ports 5176–5179: stop dev/preview servers before running it.
4. On Chrome/Edge's extensions page, enable Developer mode, choose **Load unpacked**, and select **apps/extension/dist**. Pin its action if desired. Select the demo tab, click the action, consent and start. Stop, export `.reprokit.json`, import in the dashboard, then inspect Replay and Reproduction. Reload the extension after rebuilding. HTTP preview of its UI does not verify extension permissions.
5. No environment/account/backend is required for this local flow. Run `npm.cmd run dev:sdk` on 5176 to try consented website capture/review/export. Submitting from a fresh checkout requires owner-enabled public intake configuration, as described in [website SDK setup](website-sdk.md).

## Hosted setup

Follow [hosted-setup.md](hosted-setup.md) for a new Supabase project: public dashboard env, first migration, Auth email/redirects, function secrets, validator/function and Vault/Cron. Apply `202611040002_website_intake.sql` after the first migration and install the separate public function only when using the website SDK. Apply `202611040003_project_deletion.sql` for project removal. Keep the migrations in order and record application history. Never rerun initial schema/reset over existing user data or run db push against manually initialized history without reconciliation.

The current configured backend already passed live private-account/storage, extension upload and public website submission gates. Phase 8 does not redeploy it or repeat mail delivery tests. New credentials, SMTP/mail links, provider limits and actual scheduled cleanup must be verified for each new hosted project. Privileged live test settings stay server-only and ignored; never put them in frontend env, an extension zip, a public issue or chat.

## Additional verification

```powershell
npm.cmd run test:browsers
npm.cmd run test:performance
npm.cmd run test:clean
npm.cmd audit
```

`test:browsers` requires installed desktop Chrome and Edge. It runs standalone native-window profiles because their toolbar actions stall under Playwright test-runner instrumentation, loads the local extension through the documented DevTools testing API, and closes all owned profiles/servers. It does not modify personal profiles or publish anything. `test:performance` is a separate three-case calibration and real five-minute endurance run, not part of the faster default browser suite. `test:clean` copies source/docs into ignored `.verification/clean-*`, excludes private env and installed/build directories, strips inherited ReproKit/Supabase frontend settings, installs from the lockfile with dependency install scripts disabled, checks/builds/tests, then performs actual credential-free capture/export/import. It removes only its own successful temporary checkout; a failure is retained for diagnosis. No actual remote Git clone or cloud provisioning is implied.

Your edited `tests/manual-repro.spec.ts` remains outside the default product test command. Run it deliberately with `npx.cmd playwright test tests/manual-repro.spec.ts` after providing its missing setup/values/assertions and starting the demo it targets. This command does not inherit the npm product file list. Unfinished generated TODOs intentionally fail.

## Prepare an extension archive without publishing

Build first. In PowerShell:

```powershell
npm.cmd run build -w @reprokit/extension
New-Item -ItemType Directory -Path .verification -Force | Out-Null
Compress-Archive -Path .\apps\extension\dist\* -DestinationPath .\.verification\reprokit-extension-local.zip -Force
```

The archive must contain **manifest.json at its root**, popup/review HTML, assets, content/page/replay bundles, generated `licenses-*.md` and the `licenses/` folder. Zip only dist contents. Exclude source env, reports, browser profiles, node_modules and private server settings. Inspect the generated CSP's allowed Supabase origin and public build configuration before distributing; a new developer should build against their own project. Unzip then use Load unpacked for local archive testing. This is an unsigned local archive, not a store-ready or submitted package.

## Owner decisions before public distribution

- Preserve the [MIT License](../LICENSE) and third-party notices when distributing source/builds.
- Verify the project Git root and review ignored files before each push.
- Establish a private security-reporting contact/advisory channel and update [SECURITY.md](../SECURITY.md).
- Review third-party notices, public build settings, supported browser versions and actual screenshots. Keep fonts/rrweb attribution with artifacts.
- Add upstream bot/invocation protection and spending/cleanup monitoring before broadly exposing website intake. Public keys and Origin are not authentication.
- Recheck provider Auth/mail/retention and real account isolation for the deployed environment. Local tests and passing builds alone do not make the product production-ready.
