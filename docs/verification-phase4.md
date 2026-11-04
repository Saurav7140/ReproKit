# Phase 4 verification - reproduction steps and Playwright drafts

Verified 2026-11-04 on Windows, Node 24.18.0/npm 11.16.0 and Playwright Chromium. Work stops at Phase 4. No account, credentials, backend, deployment, publication or extension-store submission was used.

## Delivered

- Deterministic chronological steps and editable `.spec.ts` generation from supported captured web actions, shared by extension and dashboard.
- New v4 reports retain input-control kind and an explicit Playwright-draft capability. Versions 1-3 still import. Legacy web actions can produce a draft with missing-data guards; non-web, empty or explicitly unsupported reports have no test export.
- Capture prefers unique short test IDs, then unique supported control roles without names. Test IDs must match `[A-Za-z][A-Za-z0-9_-]{0,63}`. Duplicate/invalid IDs, ambiguous roles and shadow-root targets receive no locator. Trusted click targets resolve to their nearest interactive ancestor. The buffer validates locators again.
- Values, labels, passwords, arbitrary DOM attributes, routes and original checked state remain masked or omitted. The popup discloses that test IDs/roles are retained; identifiers may reveal application or tenant information and need review.
- New stopped reports include derived steps in JSON. The Reproduction pane creates an editable source draft when first opened; source edits survive pane/dashboard navigation and download exactly as edited, with the validated report UUID as filename. They are not embedded in report JSON and never execute in the viewer.

## Checks actually run

`npm.cmd run check` passes TypeScript, **24 unit tests**, and every workspace build. `npm.cmd run test:browser` passes **21 Chromium tests**. The latter starts the production dashboard/demo previews when needed and loads the real built MV3 extension with its ordinary permissions.

The three Phase 4 browser scenarios verify:

1. **Real recording -> generated source -> edited download -> execution.** A toolbar-authorized recording clicks the controlled demo's actual Submit order button. The stopped v4 report contains generated steps and the test-ID action. Its unedited generated source executes in a separate real Playwright runner, clicks the button and fails at the expected missing-assertion TODO. The test author then supplies assertions confirming `Order: unsaved` and one submit attempt through the viewer editor. The actual downloaded file matches those edits and passes in the separate runner. Changing the author-supplied expectation to `Order: saved` fails because the demo deliberately does not save. No generator-created assertion, mocked save or application patch is used.
2. **Locator/privacy cases.** A clearly labelled synthetic HTML surface exercises a unique role, a password test ID, checkbox state, duplicate IDs, invalid IDs and a blocked region. Values/labels/blocked identifiers are absent from serialized evidence; expected locator kinds/control metadata remain. Its redacted starting route receives a TODO.
3. **Inert editor, retention and unavailable evidence.** Hostile report titles remain data, edited source cannot set a browser global, pane/dashboard navigation preserves the edit, and a manual device report has no test export.

The six generator unit scenarios verify deterministic order, no invented sleeps/assertions, hostile titles/locators including quotes/backticks/control characters/HTML/Unicode separators, execution-safe string literals, redacted routes, unknown locators/roles, unsupported operations, masked input placeholders, consecutive-input coalescing, bounded truncation, empty/non-web/unsupported reports and version/capability rules. Existing report/privacy/style/buffer checks remain. The buffer now reserves 64 KiB for generated steps and final metadata before accepting additional evidence; the 5 MiB report bound remains.

## Interpretation and required edits

The generated file is an editable starting point, not a guaranteed reproduction. It contains fixed TODO errors for missing targets/routes/values, unsupported controls, omitted actions and missing assertions. Replace those guards with reviewed code. It never invents credentials, authenticated storage state, fixtures, server data or business expectations. Timings are comments, not sleeps; Playwright locator waiting handles supported actions, while app-specific synchronization remains manual.

Only the first 97 actions after same-target consecutive-input coalescing are included. Truncation is explicit and guarded. Steps cap at 100 entries of 1,000 characters. Checkbox/radio state, select values, file uploads, legacy control kinds and navigation destinations require manual reconstruction. Text/password placeholders throw until a value is supplied. Source import-derived literals are escaped as JavaScript data; captured content is never inserted into comments or treated as code.

For the controlled demo, the intended saved-order assertion is supposed to fail. That is distinct from failing an unfinished draft's TODO. All three outcomes (guard failure, observed-state pass and intended-state failure) are checked from actual Playwright JSON runner results.

## UI/design review

The existing Framed sheet direction (seed 537218669) and IBM Plex typography were retained without redraws. The pane asks “Which actions can become a test, and what must I supply?” Steps lead, gaps are explicit, the labelled code textarea uses monospace and local scrolling, and export/run guidance follows. There is no Run control or decorative motion.

The agent viewed actual production screenshots at 1440/768/390px. Page overflow checks pass; source scrolls within its textarea. Figures reconcile to the real report: one submit action, capture start/stop, and zero JS/request errors for this particular flow. Missing capabilities remain explicit. A separate Impeccable polish review used the existing product/design context and direct guidance; its previously failed launcher was not presented as a successful detector run.

The primary skill's production shell inspector reports **0 failures** at all three widths, retaining the existing 46px empty-state separation warning. It measures the empty report route; the imported Reproduction pane was checked through Playwright and the screenshots below. Source lint reports **0 failures**, with four defended warnings: three factual phase labels and monospace on the literal code editor. No warning was suppressed.

- [Desktop reproduction pane](screenshots/phase4-reproduction-1440.png).
- [Tablet reproduction pane](screenshots/phase4-reproduction-768.png).
- [Phone reproduction pane](screenshots/phase4-reproduction-390.png).

These are automated Chromium interactions and agent screenshot review, not owner-performed manual acceptance. No screen-reader audit, Edge hardware run, broad real-site benchmark or production-readiness claim is made.

## Local setup and next boundary

Rebuild/reload the extension, refresh the source page, record/stop, then open Reproduction in either viewer. Export the edited test into your application's configured Playwright test directory, complete TODOs and run it with that project's Playwright command. See [README](../README.md) for the full flow. The controlled demo must be running for tests targeting port 5174. No environment variables are required through Phase 4.

Phase 5 (hosted auth/projects/private storage/ownership and retention) remains unstarted and requires separate authorization plus Supabase setup. Local reports and source edits are still page-memory only; downloaded files remain on the device until removed by their owner.
