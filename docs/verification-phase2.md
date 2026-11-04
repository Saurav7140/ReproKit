# Phase 2 verification

Date: 2026-11-03, Asia/Calcutta. Phase 2 is complete within the documented supported capture subset. Phase 3 has not started. This is not a production-readiness certification.

## What works

The built unpacked MV3 extension captures one explicitly selected top-level HTTP(S) HTML tab. Its consent popup starts a full extension capture page; that page holds one bounded in-memory report. A red indicator in the source page provides trusted Stop/Discard buttons and is excluded from capture. The capture page provides Stop/Discard, end reason, counters, evidence summary and a collapsed sanitized-JSON inspection disclosure. Nothing uploads or persists to extension storage.

rrweb 2.2.0 captures supported DOM behavior. Before extension messaging or buffering, an explicit allowlist masks text/input state, strips arbitrary attributes/styles/assets/identifiers and redacts URL paths/query/fragment/userinfo. Version 2 validates the supported sanitized rrweb subset; version 1 still validates. Page-world observers collect safe exception/rejection categories and exposed completed fetch/XHR HTTP-failure metadata through Resource Timing. Application fetch/XHR functions are never patched. The full report is runtime-validated when stopped.

Report limits: 300,000 ms, 10,000 combined evidence/timeline events, and 5 MiB serialized report including final metadata. A send-side quota also bounds JSON sent through the extension port. Error/request evidence each caps at 1,000; DOM-event sanitation caps at 512 KiB, 5,000 nodes and 64 DOM levels. Unsupported DOM channels are omitted. The isolated content bootstrap remains idle after stopping; recording observers/listeners/timers and indicator are removed.

## Commands and results

| Command / check | Result |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts` | Passed; lockfile includes private recorder workspace and pinned existing runtime dependencies. |
| `npm install --offline --ignore-scripts` | Passed; linked the new workspace using already installed dependencies. No new dependency versions or credentials needed. |
| `npm run check` | **Passed**: TypeScript, **13 unit tests**, dashboard/demo/extension builds including standalone `content.js` and `page.js`. Final unit run: 748 ms. |
| `npm run test:browser` | **12 passed**, **28.1 seconds**, against production preview builds and the actual unpacked extension. |
| design-taste `lint.mjs --app` on dashboard/extension UI and shared styles/mark | **0 FAIL**, three warnings for literal “Phase 2/3” labels. Kept because these are actual implementation stages, not decorative numbering. |
| design-taste `inspect.mjs` against production dashboard at 1440/768/390 | **0 FAIL**, one full-height root-sheet whitespace warning. Kept for the established framed-sheet workspace; no diagnostic card is stretched over missing evidence. IBM Plex Sans loaded; 22px h1 remains one line. |

Test environment: Windows, Node 24.18.0, npm 11.16.0, Playwright 1.64.1, Chromium / Chrome for Testing 156.0.8078.4. Existing locked Vite/React/TypeScript/Zod/rrweb versions were reused. Restricted Windows tsx profile access and browser-process launch/cleanup required approved sandbox escalations. All final commands above exited successfully.

## Automated evidence

Seven capture browser tests:

1. **Actual selected-tab capture**: grant temporary activeTab access, click the real popup document's start control, observe the source indicator, trigger the controlled exception/rejection/fetch 503/XHR 502, edit fields, submit the broken form, mutate DOM text/attributes and navigate within the document. Parse the actual stopped report. It contains a full DOM snapshot, supported mutations/actions, both JavaScript failure types and both HTTP failures. Serialized output contains none of the synthetic ordinary-text, form, password, textarea, editable, masked-region, attribute, URL, mutated or forged-message sentinel values. An unselected sibling tab is not captured.
2. **Navigation/reload**: both stop recording without resumption and retain already-received evidence in the still-open capture page.
3. **Source/capture closure**: source closure stops; capture-page reload disconnects/stops the source and leaves an idle page with no report or automatic restart.
4. **In-page discard and indicator removal**: a real trusted mouse click on the shadow-DOM Discard control clears capture; removing the indicator stops recording with `indicator-removed`.
5. **Permission and unsupported surface**: starting without temporary permission, and attempting a browser-internal page, produce useful errors with no recording.
6. **Strict CSP**: real capture works with page `script-src 'self'` / `style-src 'self'`, while the controlled application continues to behave normally.
7. **Immediate stop**: a Stop request as soon as the capture page is usable stays stopped after subsequent source interaction. Source review also added cancellation guards after asynchronous injection boundaries.

The first test asserts fetch and XHR `open`/`send` function identities stay unchanged, native exceptions/rejections still reach browser pageerror events, and after Stop a further real exception emits no ReproKit diagnostic messages. Discard removes the inspected payload. Responsive capture-page checks at tablet/phone widths confirm no horizontal overflow. The original four foundation/browser tests and rrweb feasibility spike also pass, giving 12 browser tests total.

Thirteen unit tests cover v1 compatibility, v2 DOM evidence, malformed/unsupported/oversized/nested reports, hostile fields/URLs, initial/mutated DOM sanitation, masked input/checkbox state, coordinate-free rrweb focus events, report chronology/capabilities, aggregate event limits, byte limits, duration boundaries, per-channel limits, and failed-closed packet validation. Byte/event/duration limit checks use the real bounded-buffer logic, not a duplicate implementation.

## Browser automation distinction

The tests invoke Chromium's real extension action via browser-level `Extensions.triggerAction` on a **tab** target to grant activeTab. Headless Chrome's toolbar popup target is not exposed as a Playwright Page, so the tests open the same built popup document in a tab while keeping the source tab active, then click its real React start control. They do not add host permissions, replace extension APIs, or inject the recorder directly from the test. The production controller performs the actual document-scoped scripting and port setup.

This proves the actual extension capture path in Chromium; it does not claim a human-operated Chrome/Edge toolbar session was tested. The unsafe-extension-debugging launch flag is confined to the automated disposable test browser; it is not a product permission or manifest setting.

## Findings corrected during implementation

- rrweb focus/blur events can omit coordinates; the sanitizer/schema now accept that supported shape, with a regression assertion.
- A capture-page reload originally retained start parameters; they are now consumed once, and a real reload test proves capture stays off.
- Stop during asynchronous startup now checks cancellation before connecting or starting further instrumentation.
- Resource Timing does not necessarily finalize an unconsumed fetch body. The controlled demo consumes its own error JSON, as an application normally would; **recorder code never reads bodies**. This limitation remains documented rather than masked by patching fetch promises.
- The test harness needed browser-level CDP and a `tab` target rather than a renderer session/page target. Those were harness failures, not a permission bypass.

## Manual review actually performed

Visually reviewed the actual stopped-capture page at desktop, tablet and phone sizes, the consent popup, idle capture page, recording indicator on the demo, and the updated dashboard at desktop/phone widths. Reviewed source and states in a separate bounded polish pass using the established design-taste direction and the previously loaded Impeccable guidance; no new direction or design skill was installed. The Impeccable context launcher was unavailable in Phase 1 and was not claimed to have run successfully here. Production dashboard inspector output is retained locally in ignored `.taste-skill/inspect-phase2`.

All interaction/capture checks described above are **automated**, not manual. No normal Chrome/Edge manual toolbar install/capture session, real touch device, screen-reader session, five-minute browser soak test, broad-site compatibility audit or full performance/security audit was performed. Duration enforcement is unit-checked and present in both source/controller watchdogs; browser recording tests are shorter sessions. Those broader checks remain release-hardening work.

## Actual screenshots

- [Recording indicator on the controlled demo](screenshots/phase2-recording-indicator.png).
- [Real stopped capture](screenshots/phase2-capture-stopped.png), [tablet](screenshots/phase2-capture-768.png), [phone](screenshots/phase2-capture-390.png).
- [Consent popup](screenshots/extension-popup.png) and [idle capture page](screenshots/extension-review.png).
- [Updated dashboard](screenshots/dashboard-1440.png) / [phone](screenshots/dashboard-390.png).

These are screenshots of the actual application and an actual capture of synthetic demo behavior; they are not invented integration data. Event counts vary with browser timing and are computed from the actual report.

## Limitations and next phase

Origins remain visible and may identify a private hostname/tenant. Text, attributes, identifiers, paths, styles and external assets are intentionally removed or masked, reducing DOM fidelity. Error messages/rejection reasons are masked; only categories and available numeric exception locations remain. Request methods are unknown, only completed exposed HTTP failures are retained, and transport failures/aborts/timeouts/opaque statuses/early or worker activity may be missing. Page messages are untrusted: source/origin/session/schema/size/rate checks prevent privileged commands and raw text forwarding, but a hostile page can forge or suppress plausible diagnostic metadata. Automatic sanitization cannot recognize every possible sensitive application value.

Closing or reloading the capture page, reloading/disabling the extension or restarting the browser loses the report. Source navigation stops capture and retains only already-received evidence. There is no durable report list or export yet. No authentication, hosted ingestion, storage, SDK, generated tests or non-web capture was added. No deployment, package publication, store submission, Git index/history changes or credentials were involved. No external setup blocks Phase 2; load the built extension and local demo using README.

Next: **Phase 3**, the full local investigation interface, editable metadata, versioned export/import and safely isolated replay viewer. Captured DOM capability means evidence exists; it does not mean replay viewing is already implemented.
