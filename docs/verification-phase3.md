# Phase 3 verification — local investigation and portable reports

Follow-up: the replay layout correction adds v3 presentation data, preserving basic layout/colours while keeping the original isolation. The final suite now passes 18 unit and 18 browser tests. See [layout correction evidence](verification-replay-layout.md); initial Phase 3 checks below are retained as history.

Verified 2026-11-03 on Windows with Node 24.18.0, npm 11.16.0 and Playwright Chromium 156. All work is local; no accounts, backend credentials, deployment, package publication or store submission were used. Phase 4 remains unstarted.

## Delivered workflow

Both the full extension page and dashboard share a one-report investigation view: editable title/description, save-before-export, evidence counts, filtered/paginated timeline, errors, failed-request metadata, context/capabilities, optional isolated replay and JSON inspection. Version 1 stays importable without replay. New captures/exported reports use version 2. Non-web/manual reports show unsupported evidence rather than broken web controls.

Imports validate before opening and before asking to replace an existing report. Malformed, oversized, unsupported-version and unsafe replay imports preserve the current report and unsaved edits. In-flight import cancellation ignores late results. Replacement/removal use keyboard-accessible confirmation dialogs. Reports/edits stay in page memory; reload closes them. Downloaded `.reprokit.json` files remain until the user deletes them.

## Automated checks actually run

- `npm.cmd run check`: TypeScript passes; **17 unit tests pass**; dashboard, extension (UI/content/page/replay bundles), demo and workspace builds pass. Runtime rrweb record/replay dependencies are pinned to 2.2.0 in the lockfile.
- `npm.cmd run test:browser`: **17 Chromium browser tests pass**, retaining the Phase 1/2 checks plus five Phase 3 scenarios.
- A separate Chromium smoke check started the dashboard with `npm.cmd run dev -w @reprokit/dashboard -- --port 5176`, imported a clearly synthetic v2 fixture and loaded isolated replay successfully. The temporary server was stopped afterward. Renderer assets compile at dev-server startup; restart after changing that driver.
- The primary design skill's source lint reports **0 failures**, with three warnings for literal phase labels. Those labels communicate actual release scope; they are not ornamental section numbering.
- Its production dashboard inspector reports **0 failures** at 1440/768/390px, with one warning for a 46px internal empty-state band. This is retained spacing between the local import job and separately labelled development fixture, without stretched data panels. No inspector rule was disabled. Report: `.taste-skill/inspect-phase3/report.json` (generated/ignored).

Browser coverage includes:

1. Real MV3 action -> selected-tab demo recording -> two deliberate JS failures and fetch 503/XHR 502 -> stop -> edit/save -> actual browser download. The downloaded JSON validates and excludes synthetic secret markers. A fresh browser context without the extension imports the downloaded file into the dashboard and inspects errors, request statuses and visible masked replay. A clean extension viewer imports the same file and displays replay.
2. Clearly labelled synthetic replay fixture: play/pause/keyboard seek applies a captured DOM mutation. The outer data document has opaque origin `null`, cannot read its parent, and exposes no extension runtime; its inner captured document has no `allow-scripts`. The same parent/origin/runtime/inner-sandbox checks run in the real extension viewer. A network probe is blocked by CSP before any request reaches the route. Appending an actual script into the captured document does not execute it.
3. Malformed JSON, unsupported version, missing structure, >5 MiB file and hostile replay attributes are rejected while retaining the open report and an unsaved title. Cancellation preserves edits. Replacement with the same report ID resets the viewer only after confirmation. Hostile metadata displays literally without creating HTML or executing a handler.
4. A deliberately delayed native-file read is cancelled, then released; its late result cannot replace the open report. Reload clears local evidence. Removal can be cancelled; confirmation clears the report and returns focus to Import.
5. Keyboard focus moves to imported report identity, dialogs focus Cancel and Escape cancels. Dashboard navigation preserves drafts. Timeline pages contain at most 50 rows; filtering resets pagination. Manual device reports show unavailable/unsupported evidence. Timeline/request/context layouts have no page overflow at 1440/768/390px.

Unit additions exercise portable round-trip/ID-only filenames, validation before reading oversized files, cancellation before/during read, malformed/version errors without content echo, unsafe replay tags/attributes, aggregate node limits and oversized replay viewport dimensions. Existing byte/depth/capability/time/privacy/buffer checks remain.

## Visual inspection and separate review

The existing **Framed sheet**, seed **537218669**, was retained without redraws. IBM Plex remains locally bundled; diagnostic figures and identifiers use tabular numbers/monospace. The screen asks “What evidence explains this failure, and what can I share?” The evidence contract remains the product-specific element.

The agent viewed the inspector's desktop/tablet/phone images and actual report/replay screenshots. A separate Impeccable polish pass used existing PRODUCT.md/DESIGN.md and the polish/craft guidance directly: its launcher had previously failed with `cache_directory_failed`; no successful Impeccable detector run is claimed.

The bounded review checked shared edges, forms, count reconciliation, honest zero/missing states, restrained status colour, phone navigation and diagnostic wrapping. Corrections included sizing replay against its actual captured iframe, testing visible source content, and clipping the unfocused skip link so full-page browser captures do not display its offscreen surface. Confirmations protect unsaved work; replay is destroyed when its evidence pane closes or dashboard Reports is hidden. No ornamental motion or invented evidence was added.

Screenshots are automated captures reviewed by the agent, not owner-performed manual browser acceptance:

- [Real exported report in dashboard replay](screenshots/phase3-dashboard-replay.png).
- [Same report in clean extension replay](screenshots/phase3-extension-replay.png).
- [Desktop investigation](screenshots/phase3-investigation-1440.png), [tablet](screenshots/phase3-investigation-768.png), [phone](screenshots/phase3-investigation-390.png). These use the explicitly labelled hand-authored v1 fixture plus synthetic pagination data; they are not captured evidence.

## Isolation decision and limits

The first outer sandbox design propagated an opaque sandbox-origin flag into rrweb's nested iframe, preventing its supported DOM access. The final design uses a naturally opaque `data:` document for the trusted driver and rrweb's own script-disabled child. No unsafe rebuild/canvas option was enabled. See [rrweb sandbox guidance](https://rrweb.com/docs/sandbox), [canvas safety](https://rrweb.com/docs/recipes/canvas) and [data URL origins](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data).

In the initial Phase 3 build, captured CSS/assets/media/identifiers/text were stripped or masked. v2 replay remains an unstyled DOM view. New v3 captures retain validated presentation values but do not provide pixel-perfect recreation; replay cannot restore authentication, backend state or services. Structurally valid but incomplete event sequences may fail replay safely while other evidence stays available. The extension exposes only static renderer JS/CSS as web-accessible resources; this can reveal extension presence to a site that knows its ID, and exposes no reports.

Import validation cannot certify privacy. Origins and manually entered metadata can be sensitive. Removal releases page references, not downloaded files or a guarantee of immediate memory zeroization. Native bounded file reading may finish after cancellation, but its result is ignored. No persistent list, hosted retention, generated steps/tests, Edge hardware run, screen-reader audit or production release certification was performed. Existing Phase 2 capture/lifecycle/Resource Timing limitations still apply.

No external setup is required for local use. See [README](../README.md) for exact run/load/import/export steps. Hosted setup begins in Phase 5; the owner still needs to choose a license before distribution.
