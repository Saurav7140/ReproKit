# Verification evidence

Historical Phase 0/1 log. Current capture behavior and verification are in [Phase 2 evidence](verification-phase2.md).

Date: 2026-11-03 (Asia/Calcutta). This is a foundation verification log, not a release certification.

## Environment and scope

- Empty task directory inspected before changes; no applicable ancestor or repository AGENTS.md found. Existing unrelated user files were not modified. Git resolves through an ancestor outside this task directory; no Git history/index changes or commits were made. Source and `package-lock.json` are present for review and commit.
- Windows, Node 24.18.0, npm 11.16.0. Locked TypeScript 7.0.2, Vite 8.3.5, React 19.3.1, Zod 4.6.7, Playwright 1.64.1, rrweb record 2.2.0.
- Browser: Playwright Chromium / Chrome for Testing 156.0.8078.4, headless; persistent Chromium context for MV3. Installed Chrome/Edge are not certified by these tests.
- No credentials, Supabase services, deployment, extension store, or real personal data used.

## Automated checks

| Command | Result |
| --- | --- |
| `npm view vite version engines --json` and version queries for React, rrweb and Playwright | Current registry versions checked; Node engine requirement satisfied. Network access required an approved sandbox escalation. |
| `npm install --save-dev --save-exact ...` and workspace Zod install | Succeeded; exact dependency entries and npm lockfile generated. npm reported zero vulnerabilities at install time. This is not a security audit. |
| `npm run check` | Passed: TypeScript, all six unit tests, all three Vite builds. |
| `npm run build` and `npm run typecheck` after final typography edits | Passed. Dashboard, demo and extension built; extension output includes both pages and manifest. |
| `npx playwright install chromium` | Succeeded, installing isolated test browsers/tooling. |
| `npm run test:browser` against final production previews | **5 passed**, 4.7 seconds. Actual browser workflows below. |
| design-taste `lint.mjs --app` on five UI files | **0 FAIL**, one warning: literal “Phase 2” mistaken for decorative numbering. Kept because it communicates real implementation availability. |
| design-taste `inspect.mjs` against production preview, widths 1440/768/390 | **0 FAIL**, one warning: a 50px blank band in the full-height root workspace sheet. Kept: the sheet forms the viewport frame; there is no stretched diagnostic card hiding missing content. IBM Plex Sans loaded at all sizes; h1 remains 22px on one line. |

The final inspector used the downloaded Chromium executable via CHROME_PATH. Earlier attempts failed with a sandbox CDP timeout and, after server teardown, connection refused; the final running production preview completed successfully. Local font, text-contrast, overflow and focus checks passed within the inspector's measured scope. This does not replace a full accessibility audit.

## Unit checks (six tests)

1. Valid web fixture and non-web/manual report without browser evidence.
2. Malformed JSON, missing/wrong structure and unsupported versions.
3. 5 MiB limit, including UTF-8 multibyte size checks before JSON parsing.
4. Unknown fields, disallowed URL schemes/credentials/query/fragment and unsupported replay content.
5. Chronology, duration, aggregate event count, text bounds, source/evidence/capability consistency and HTTP failure status.
6. Hostile markup stays a string; validation errors do not echo attacker-chosen keys.

The parser validates structure. It is not a privacy sanitizer. No claim is made that arbitrary report text is free of sensitive values.

## Actual automated browser workflows

- Dashboard: zero reports, explicit synthetic fixture label, validate sample, expected computed counts, report-format and privacy navigation, reload clears fixture state; no page errors or non-local app requests observed.
- Demo: observed uncaught timer exception and unhandled rejection through browser pageerror events; fetched actual deterministic local 503 and 502 responses with the identifying response header; clicked fetch/XHR actions and observed statuses; clicked form submit, confirmed unsaved order/one attempt and no POST request. Verified synthetic password and masked-region fixture presence.
- Responsive: dashboard/demo at 1440, 768, 390; no document horizontal overflow, local font loaded, actual screenshots saved. Keyboard Tab reaches the visible skip link with a solid outline.
- Extension: loaded the **built unpacked MV3** shell in persistent Chromium, confirmed zero permissions/host permissions/content scripts, opened its popup document, clicked the investigation action, and verified the real `chrome.tabs.create` full page. Captured both surfaces. This test opens the action document as a tab; it does not test clicking browser toolbar chrome or popup focus/dismissal.
- rrweb spike: injected the installed local UMD bundle into a synthetic test-only document; typechecked its options; observed initial events, input/text mutations and stop cleanup. Input, textarea, ordinary text, contenteditable and blocked-region sample strings were absent from serialized spike events. Sensitive URL/attribute samples **remained**, as expected. This evidence requires a pre-buffer sanitizer in Phase 2. The spike is not imported by any app and does not implement the extension recorder.

The initial extension test failed because the test hashed Windows paths as UTF-8. Corrected to Chromium's native UTF-16LE path hashing ([upstream implementation](https://github.com/chromium/chromium/blob/main/components/crx_file/id_util.cc)); the actual MV3 test then passed. An initial typecheck caught a stream-array annotation, also corrected. The sandbox blocked tsx's Windows profile lookup; an approved retry passed. A sandbox browser run needed interruption during Windows server cleanup; the final approved production run exited normally.

## Manual review actually performed

Visually inspected the generated dashboard desktop/tablet/phone images, demo phone/desktop images, and extension popup/full-page images. The separate Impeccable polish pass preserved the framed-sheet direction, increased metadata readability, replaced the glyph mark with a shared SVG, removed a decorative empty-state marker, and checked honest scope/empty states. Final production screenshots were visually reviewed after that correction batch. The Impeccable context launcher failed with `The system cannot find the batch label specified - cache_directory_failed`; its documented direct-context fallback was used with PRODUCT.md, DESIGN.md, and the polish/craft guidance. No detector success is claimed for that launcher.

No human-operated toolbar install/capture workflow, screen-reader session, real touch device, or normal Chrome/Edge manual interaction was performed. Browser interaction checks above are automated, not manual. No capture/export/import workflow exists to test yet.

## Actual application screenshots

- [Dashboard desktop](screenshots/dashboard-1440.png) / [phone](screenshots/dashboard-390.png).
- [Controlled demo desktop](screenshots/demo-1440.png) / [phone](screenshots/demo-390.png).
- [Extension popup document](screenshots/extension-popup.png) / [full investigation shell](screenshots/extension-review.png).

These show the real foundation application, not real recordings. Inspector raw measurements/screenshots are local ignored `.taste-skill/inspect-production` artifacts; this log retains their results.

## Remaining limits and setup

No recorder integration, replay, arbitrary user import/export, generated tests, authentication, storage, hosted migrations, SDK or non-web capture. No privacy/performance/replay-isolation claim for a recorder. Cross-origin frames and other unsupported surfaces remain out of scope. Hosted ownership, retention and abuse controls are unimplemented and unverified. No Supabase setup is needed for this delivery; Phase 5 needs a project, auth/mail URLs, private storage and tested RLS/migrations. License selection remains with the owner.

Next authorized work would be **Phase 2: local selected-tab capture**, starting with the sanitizer and lifecycle tests. It has not been started.
