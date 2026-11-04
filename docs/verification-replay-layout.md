# Replay layout correction

2026-11-03. The owner's comparison showed that replay reconstructed the DOM with all layout stripped. The initial Phase 3 implementation intentionally omitted CSS, but that made visual investigation too limited. This correction stays within Phase 3; reproduction generation and hosted features remain unstarted.

## Behavior

New v3 recordings preserve selected resolved grid/flex layout, dimensions, spacing, basic typography, RGB colours and borders. Form/text masking and explicitly blocked regions remain. Original stylesheets, arbitrary CSS strings, selectors, custom properties, images, remote fonts and asset URLs are excluded. Versions 1 and 2 still import; older replay displays an explanation that new recording is required for styling. Existing discarded CSS cannot be reconstructed.

The extension has been rebuilt as 0.3.1. Reload it at `chrome://extensions`, reload the dashboard, and make a new recording. Save/export any open report before reloading its viewer. The currently running local preview serves the rebuilt files; if using the dev server, restart after renderer changes.

## Verification actually performed

- `npm.cmd run check`: TypeScript, **18 unit tests**, and all builds pass.
- `npm.cmd run test:browser`: **18 Chromium browser tests** pass, including all previous capture/lifecycle/privacy/portable-report tests.
- The full suite reused the owner's running local dashboard. A separate production preview on port 5176 also imported the actual downloaded v3 report, displayed its grid, retained the opaque origin and made zero remote requests. That temporary preview was stopped; the owner's existing servers were left running.
- Existing real capture -> actual download -> clean dashboard -> clean extension import now asserts that replay's grid display, column widths and gap exactly match the source page's computed values in **both viewers**.
- A new real extension recording starts at 1440px, captures an ancestor class changing the grid, resizes to 390px, and stops with pending presentation. Initial and final replay grid widths/columns match the corresponding source values; the final background colour and inner viewport width also match. This exercises cascading changes, responsive resizing, final-stop flushing and End seeking.
- The test adds synthetic CSS custom-property, font-name and background-image secrets. None appears in the exported/serialized recording. Unit tests reject CSS URLs, generated text, variables/functions, arbitrary font names, escaped values, oversized declarations and unsupported properties; v2 cannot falsely claim the new presentation format.
- Existing isolation checks still prove opaque origin/parent separation, absent extension runtime, blocked fetch, and no captured script execution. Malformed/oversized/version/hostile imports still fail safely.

The agent visually reviewed actual dashboard and extension replay screenshots after the correction. This is automated Chromium interaction plus screenshot review, not an owner-performed manual run. The existing Framed sheet direction, seed 537218669, was preserved; only replay evidence and explanatory copy changed.

The primary skill's final production inspector on port 5176 reports zero failures at 1440/768/390px, retaining the earlier 46px empty-state spacing warning. Source lint has zero failures and the same three literal-phase-label warnings. The earlier pass on the owner's dev server was followed by this production pass; neither warning was suppressed.

- [Real styled capture in dashboard](screenshots/phase3-dashboard-replay.png).
- [Same capture in extension](screenshots/phase3-extension-replay.png).
- [Recorded desktop layout](screenshots/replay-layout-desktop.png).
- [Recorded resized layout at End](screenshots/replay-layout-resized.png).

## Limits and security

This remains masked DOM replay, not video or a pixel-perfect page copy. Generic fonts and masked text can change inline wrapping; images, pseudo-elements, transforms, continuous animations and unsupported effects may differ. Presentation samples follow observed events and coalesce over 100ms; this is not per-frame animation capture. No new capture permissions or external requests are introduced.

Only a bounded numeric/enumerated/RGB presentation subset is retained and validated again at import/replay. The inherited extension CSP permits style attributes so this validated subset can render; it does not enable inline scripts, arbitrary stylesheets or network access. The captured frame still has no `allow-scripts`. Presentation/geometry can reveal visual application state, and origins/manual metadata remain visible; inspect before sharing.

The existing 512 KiB DOM-event, 5 MiB report and 5-minute/10,000-event bounds remain. Presentation increases payload size and computation, so complex pages may reach limits sooner. No broad real-site performance benchmark, Edge hardware run, pixel-perfect certification or Phase 4 work was performed.
