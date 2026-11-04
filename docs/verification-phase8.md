# Phase 8 verification — hardening and release preparation

Date: 2026-11-04. Phase 8 covers the implemented web product only. No deployment, store submission, npm publication, Git initialization/staging/push, license selection or native/mobile/device capture is performed.

## Changes

The shared confirmation dialog now closes/restores its opener in a layout effect before React detaches it. The new keyboard regression caught the lost-focus behavior; the fix reaches local replacement/removal, hosted deletion and SDK discard through the existing component. Native modal behavior is retained, including Cancel-first focus and Escape. A visual pass removed redundant bottom margin inside empty report states and updated phase labels; the Framed sheet/IBM Plex direction was preserved.

Verification entry points now distinguish the product suite from the user's manual reproduction draft, installed-browser workflows, performance/endurance and a clean source copy. Build runs before server tests so the shared validator cannot be tested from a stale generated bundle. Production builds retain separate dependency notices across UI/content/page/replay/validator sub-builds. Explicit font/rrweb license texts fill gaps in automatic metadata. No dependency was added or upgraded. [Contribution](../CONTRIBUTING.md), [security reporting](../SECURITY.md), [owner license decision](../LICENSE-STATUS.md), [setup/package checklist](release-checklist.md) and [known limitations](known-limitations.md) now stand on their own.

## Verification gates

| Gate | Evidence and limits |
| --- | --- |
| Types/builds/unit/database/server | `npm.cmd run check`: 50 checks, all apps and server validator. Real PostgreSQL via PGlite applies both migrations from empty fixture schemas and exercises ownership/RLS, private bucket policy, leases, immutable uploads, owner/public rate/capacity counters, rotation/disable and cleanup. Provider adapters cover partial failures and invalid/authenticated/public request boundaries. |
| Product browser regressions | `npm.cmd run test:browser`: 34 cases across the existing eight files plus hardening. Actual MV3 capture/privacy/lifecycle/replay/reproduction, portable files, hosted/connection UI fixtures and website SDK checks remain. Added v1–v4 export/import equality, invalid/oversized/deep/unknown imports preserving unsaved details, keyboard review/modal focus/return, labelled controls, narrow layouts and same-session hostile diagnostic flood checks. The manual draft is not executed or modified. |
| Named installed browsers | Standalone `npm.cmd run test:browsers`: Chrome **156.0.8078.80** and Edge **156.0.4314.58**, Windows x64. Both perform real selected-tab action/capture, error/fetch evidence, secret absence, actual download/import, visible replay, generated reproduction and SDK consent/start/stop/reload. Exact versions in [browser result](phase8-browsers.json). No extension APIs/permissions are mocked. These are version-specific checks, not every-version certification. |
| Performance/endurance | Three separate `test:performance` cases passed. See measurements below; diagnostic floods and oversized live DOM terminate/bound safely. Existing unit tests enforce 10,000-event/5 MiB/5-minute boundaries without accepting the excess packet. |
| Dependency advisories | `npm.cmd audit --json` returned zero known vulnerabilities across the locked dependency tree on this date. This is an advisory lookup, not a complete supply-chain/security audit. |
| Clean source copy | `npm.cmd run test:clean` verifies lockfile install, types, builds, all 50 local tests and two actual capture/export/import browser cases with no private env/account/backend settings. Successful checkout removed; failed checkouts are retained. It is a fresh filesystem source copy, not an actual remote Git clone. |
| Packaging | `.verification/reprokit-extension-local.zip`: 63 entries, inspected root manifest, only activeTab/scripting, no host permissions/content-script auto-start, expected replay resources and full notices. No env/reports/node_modules/browser profiles are included. SHA-256 `C25061B0F3D7E260C5DB5F356670605266AB6C5543962F82338082DEE7EADF35`. No upload/store submission occurs. |

The initial Chrome/Edge test-runner attempts stalled on their native action; a standalone native-window control proved the operation worked. The delivered standalone command avoids that instrumentation and passed the complete workflows. An initial test import also lost the downloaded file's `.json` name; the check now imports the actual downloaded bytes under their suggested filename. Neither test workaround broadens extension permissions or bypasses consent.

The keyboard case first over-assumed browser-chrome focus wrapping from Shift+Tab; it was corrected to check document controls and native modal traversal. Its subsequent Escape assertion exposed the genuine opener-focus regression, fixed in the shared component. Failures were investigated rather than hidden or presented as passing checks.

## Measured recording costs

Hardware: AMD Ryzen 7 7435HS, 16 GiB RAM, unthrottled local bundled Chromium **156.0.8078.4**. The synthetic fixture changes text/margins on 80 buttons over 30 animation frames after one warm-up. Source heap is a post-GC delta, not peak memory. Stop timing ends at stopped UI, before opening the multi-megabyte JSON inspector.

| Measurement | Result |
| --- | --- |
| Baseline frame median / p95 | 6.0 / 6.3 ms |
| Recording frame median / p95 | 17.7 / 29.8 ms |
| Start / stop to reviewed UI | 985 / 337 ms |
| Source heap delta | 3.15 MiB |
| Serialized workload report | 3,911,504 bytes, below 5 MiB |
| 6,000-node live DOM | Ended at evidence limit in 244 ms; bounded valid partial report |
| Real endurance wall time | 300,259 ms |
| Endurance report duration | 300,000 ms; automatic `duration-limit` |
| Endurance serialized report | 1,975,128 bytes; 902 replay events; zero uploads |

[Raw workload measurement](phase8-performance.json), [real endurance result](phase8-endurance.json). The conservative regression budgets are p95 frame under 250 ms, source long task under 2 s, stop under 2 s and post-GC source delta under 64 MiB. The oversize fixture must end under 3 s. They are local synthetic checks, not product latency promises. Rapid style changes can use most of the report budget in less than a second; retained evidence bounds do not cap every browser allocation or hostile-page observation cost. No load test, slow-device, background-throttling or distributed-abuse certification is claimed.

## Privacy, compatibility and feature evidence

| Advertised behavior | Evidence |
| --- | --- |
| Explicit selected-tab capture, stop/discard and lifecycle | Current capture/product tests, named Chrome/Edge workflows; [Phase 2](verification-phase2.md) |
| Masked text/inputs/regions/URLs and bounded messages | Current actual secret-absence capture assertions, same-session forged/flooded diagnostics, sanitizer/buffer tests; [privacy](privacy.md) |
| DOM replay with safe layout/colour, no active assets/scripts/network | Current investigation isolation/cascade/viewport tests and named actual replay; [layout correction](verification-replay-layout.md) |
| v1–v4 reports, local export/import/edit/removal | Current four-version file round-trip, malformed/oversize/deep/import cancellation/draft preservation and keyboard cases |
| Editable guarded Playwright export | Current actual capture/download/separate execution test, hostile source/locator/privacy cases; [Phase 4](verification-phase4.md). Expected deliberate unsaved-order assertion failure is evidence of the sample bug, not an unreported product-suite failure. |
| Auth/private projects/status/Storage/cleanup | Current SQL/handler and intercepted UI regressions; actual two-account isolation, Storage/deletion/failure recovery and scheduled cleanup in [Phase 5](verification-phase5.md). Owner previously confirmed real confirmation/reset emails. No mail or cloud provisioning is reverified this phase. |
| Temporary extension connection/explicit private upload | Current connection regression, offline/expiry/duplicate/link checks; actual unmocked capture/upload/dashboard in [Phase 6](verification-phase6.md) |
| Consented website capture/separate public submission | Current SDK/missing-status/consent/privacy and SQL/handler cases, named SDK workflows, actual unmocked public POST/private review/quota/rotation in [Phase 7](verification-phase7.md) |

Hosted fixtures are not cloud integration evidence. The prior live runs remain dated evidence; no backend application code/schema changed in this phase. Repeat live hosted/mail/scheduler checks for a new project or material backend change. Public intake still needs upstream bot/invocation protection before broad exposure.

## Bounded visual and accessibility review

Existing Framed sheet seed 537218669, IBM Plex fonts and mark retained. Source review: **0 failures / 3 defended warnings** (two factual phase labels and the literal source editor's monospace font). Final production dashboard inspection: **0 failures / 1 defended spacing warning** at 1440/768/390px. The remaining 42px separation keeps the primary import/empty-report workflow apart from the optional, explicitly labelled contract fixture below it. No warning was suppressed. Report/reproduction and owner intake/SDK states have real browser screenshots and horizontal-overflow checks. The empty-state extra bottom margin was corrected. No style redraw, imagery, fabricated metrics or decorative motion was added.

The primary question is which report to investigate. Import is the strongest action in the empty state; after import the title, saved details and evidence lead. Edges align, actual zeros/capability gaps are explicit, counts derive from evidence, code scrolls within its own field and phone navigation remains labelled. Existing monochrome surfaces carry colour only for actions/status. No chart totals or legends are invented. Native labelled controls, visible focus, Cancel-first modal behavior, Escape/opener restoration, report-heading focus and post-removal Import focus are checked. No NVDA/JAWS/hardware screen-reader certification is claimed.

- [Report desktop](screenshots/phase8-review-1440.png), [tablet](screenshots/phase8-review-768.png), [phone](screenshots/phase8-review-390.png).
- [Actual Chrome replay](screenshots/phase8-chrome-replay.png), [actual Edge replay](screenshots/phase8-msedge-replay.png).
- [Website consent/review and owner intake](verification-phase7.md#visual-review) remain part of the same interface, re-exercised by current product tests.

## Run and manual checks

Run `npm.cmd run dev` and `npm.cmd run dev:demo` in separate terminals; build/reload the unpacked extension. Record synthetic failures, stop, inspect all evidence panes, edit/save/export, import into the dashboard and try keyboard removal/cancel. Try malformed import over an unsaved title: the report/draft must remain. Verify capture navigation/reload/discard never resumes. Exercise consented SDK reporting with `npm.cmd run dev:sdk`; the existing configured sample project receives only explicit Submit. Check offline failure preserves export and sign-in privately before reviewing hosted reports. [Full commands and packaging](release-checklist.md).

All planned phases (0–8) are implemented and locally verified. Release decisions remain with the owner: project license, correctly rooted Git repository/private security contact, public-intake upstream protection and actual distribution/deployment. No “production-ready” claim is made.
