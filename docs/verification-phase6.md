# Phase 6 verification — complete

Date: 2026-11-04. The owner authorized the extension connection after Phase 5 acceptance. The extension is version **0.6.0**; portable reports remain v4 with v1–v3 compatibility. No dashboard/extension publication, store submission, website SDK or later-phase work was performed.

## Result

The full installed-extension workflow works against the configured live backend: selected-tab recording → stop/review/save details → connect with an existing account → choose a project → explicitly upload → open the exact private dashboard report and visible masked replay. Retrying the identical report produced **one** stored report. Actual offline upload/disconnect preserved local evidence and export. The temporary synthetic account, project, report/object and privileged test configuration were removed; existing user projects and the 15-minute cleanup job remain.

## Changes and boundaries

- `Connection.tsx` uses the existing Supabase SDK in the trusted review page. Connection and credentials stay in memory; URL session detection and persistent session storage are disabled. Each open review page needs its own sign-in. Dashboard signup/reset are linked separately.
- No new browser permissions, host permissions, storage, background worker, external messaging or website-token bridge. The permission set is still `activeTab` + `scripting`.
- Vite reuses the dashboard's **public** URL/key by default, permits optional extension overrides, validates them before bundling, and generates CSP with only the configured Supabase origin. An unconfigured build retains `connect-src 'none'`. Sub-builds preserve this manifest. All SDK code is bundled locally.
- The shared `requestHosted` helper reuses validation, bounded fetches and one refresh-on-401 attempt. Rejected credentials clear the extension connection without changing the local report. Offline disconnect clears local auth immediately and separately attempts remote sign-out.
- Save-details and in-flight guards prevent unreviewed/stale/duplicate UI submissions. Existing backend hashes, quotas and idempotency remain authoritative. A changed same-ID payload still conflicts instead of overwriting an existing report.
- The existing function was deployed as **version 2**, adding CORS for syntactically valid Chromium extension origins. This accommodates different IDs rather than treating an ID as authentication. JWT verification through Auth, ownership, RLS, private Storage and all limits remain mandatory; public keys/allowed Origin alone do not authenticate.
- Saved links carry only validated project/server-report UUIDs. Dashboard sign-in and ownership are required; malformed/unavailable/other-project links do not mint a recording read URL. No token is placed in a link or report.

## Checks actually run

| Check | Result |
| --- | --- |
| `npm.cmd run check` | Pass: TypeScript, **43 unit/database/server tests**, all builds and server validator bundle. The user's manually edited `tests/manual-repro.spec.ts` remains untouched and is not executed. Vite retains its SDK chunk-size warning; no build failure. |
| Explicit seven-file product browser suite from README | **27 passed**. Prior capture/privacy/replay/reproduction/hosted tests plus four new connection cases. |
| Isolated configured extension fixture | Real unpacked extension, actual capture and form controls with intercepted synthetic provider traffic. No uploads before explicit click; dirty details block upload; 401 refresh + 503 failure preserves report; retry succeeds; rapid duplicate clicks produce one request; link opens the exact dashboard report after sign-in. |
| Expiry/offline fixture | A rejected refresh clears expired connection state; report/export remain. Network aborts exercise upload failure and offline disconnect. LocalStorage/sessionStorage stay empty in the extension; reload clears connection and report. No extension APIs/permissions are mocked. |
| Link/unconfigured fixtures | Malformed/other-project links show safe errors without recording reads. A separate build with no URL/key imports/exports locally and keeps network blocked. Test configuration never changes the production bundle or private environment files. |
| Core/server tests | Safe origin/UUID link generation/parsing; extension CORS response and public-key/Origin authentication denial; malformed/opaque/arbitrary origins denied. Existing SQL/RLS/lease/quota/cleanup tests still pass. |
| Separate unmocked live browser run | **Pass**, using the production extension and dashboard with real Supabase Auth/Postgres/Storage. Fresh v4 capture uploaded directly from the extension, repeated upload retained one report, exact saved link opened after dashboard sign-in, masked replay DOM/heading visible, offline failure/disconnect/export worked, reload cleared connection. |
| Post-test management audit | Zero Phase 6 synthetic accounts, reports or recording objects; existing projects preserved (two present at the final audit). Existing cleanup schedule remains `*/15 * * * *`. No private environment files tracked. |

The live acceptance uses a temporary admin-confirmed synthetic account and does not send mail. Phase 5's owner-confirmed email/links remain the mail-delivery evidence. Expired/revoked credential behavior is exercised through intercepted Auth responses; actual upload/account/session/CORS/Storage integration and actual offline network failure are verified separately. This is not a load, hardware or every-browser certification.

During implementation, the expiry case found stale “Connected” UI after refresh rejection; it now resets the connection while preserving the report. Playwright's fulfilled fixtures bypass its offline switch, so synthetic offline tests explicitly abort the relevant requests; the live test uses actual offline networking. No passing mocked test is presented as hosted integration evidence.

## Visual review

Existing **Framed sheet**, seed **537218669**, IBM Plex and controls retained with no redraws. Source lint reports **0 failures / 3 defended warnings**: two factual phase labels and monospace on the literal source editor. The production dashboard sign-in inspector reports **0 failures / 2 desktop warnings**: the deliberate unused right side of its readable 480px form and the existing sheet's whitespace below it. No warning was suppressed.

The inspector measures the dashboard entry, not an authenticated extension page. The extension was reviewed separately through actual unpacked-browser interactions, overflow checks and screenshots at all three widths. Its question is “Where should I save this reviewed report?” The project/upload row answers it; evidence remains first, edges align with the viewer, colour is limited to existing actions/status, controls wrap on phones and no fabricated metrics/charts/animation were added. The synthetic account email and project are real test fixtures, not customer data.

- [Actual live extension connection — desktop](screenshots/phase6-live-connection-1440.png), [tablet](screenshots/phase6-live-connection-768.png), [phone](screenshots/phase6-live-connection-390.png).
- [Actual saved report and visible dashboard replay](screenshots/phase6-live-dashboard-replay.png).
- [Intercepted UI fixture — desktop](screenshots/phase6-connection-fixture-1440.png), [tablet](screenshots/phase6-connection-fixture-768.png), [phone](screenshots/phase6-connection-fixture-390.png).

## How to run and what to test

1. Start `npm.cmd run dev` and `npm.cmd run dev:demo` in separate terminals. The current public dashboard configuration/backend are ready.
2. Run `npm.cmd run build -w @reprokit/extension`, then **Reload** the unpacked extension in Chrome/Edge and refresh the demo tab. Select `apps/extension/dist` if loading it for the first time.
3. Record and stop. Save any edited title/description. Below the viewer choose **Connect to dashboard**, enter an existing confirmed account email/password, select a project and click **Upload reviewed report**.
4. Follow **Open saved report in dashboard**, sign in there if needed, and check the title, evidence, replay/reproduction and saved status.
5. Retry an identical upload and check there is no duplicate. Edit/save the same report and check its changed payload is rejected rather than overwriting stored evidence.
6. Disable network and try upload. Check the local report/export remain; reconnect and retry. Disconnect offline and verify local evidence still works. Close/reload only after exporting: both report and connection are temporary.
7. Open another review page and confirm it starts disconnected. A saved link opened under another account must not reveal the report. New checkout without public configuration must still capture/import/export locally.

Signup and password recovery remain in the dashboard. Rebuild/reload after public configuration changes. A different unpacked extension ID needs no backend secret change. A new dashboard origin requires updating its configured origin/Auth redirects. [Full setup](hosted-setup.md), [README](../README.md).

## Limits and next boundary

No browser-wide/persistent connection is promised: sign in per review page. Closing/reloading loses local evidence and connection; disconnect preserves evidence. Remote sign-out may fail offline, and issued access tokens follow provider expiry. Server limits can require waiting for a 15-minute work lease or hourly quota. Source edits are still never executed by the viewer.

The temporary privileged test configuration is removed after live verification; the ignored server secret file is preserved. Git currently resolves to `C:/`, so create a repository inside ReproKit before a future GitHub push and keep environment files excluded. No repository history/index was changed. Phase 7 is not started automatically.
