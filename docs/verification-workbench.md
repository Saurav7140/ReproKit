# Dashboard and investigation workbench

Approved on 2026-11-05. The redesign keeps IBM Plex, the loop mark, teal, existing routes and report behavior. Overview leads with import/example actions and capture guidance. Investigations place compact metadata above an evidence sidebar. Phone layouts wrap the evidence controls; recording keeps Stop and Discard ahead of supporting instructions. Light, dark and system appearance remain available on both surfaces.

## Checks completed

- `npm.cmd run check`: types, production builds and 51 core/recorder/server tests passed. Dashboard and extension were rebuilt, and types checked again, after the final replay slider correction.
- All 18 selected dashboard, investigation and reproduction browser cases passed across the suite and isolated replay reruns. An overlapping diagnostic run collided with the suite's trace directory; affected cases passed when rerun in separate output directories.
- The replay regression now waits for progress before pause/End/Home/ArrowRight/play-to-completion. It passes in both the dashboard and native extension. Fractional timer positions are rounded to the range input's existing whole-millisecond step so a second change event cannot undo a seek.
- Playwright CLI: 34 functional checks covering import/export roundtrip, themes, evidence navigation, cancellation and replay isolation.
- Playwright CLI: 40 screen/theme/viewport combinations at 375, 768, 1280, 1440 and 1920 pixels without page overflow.
- Sampled enabled visible text contrast: minimum 5.32:1 light and 7.17:1 dark. This is a targeted measurement, not a complete accessibility audit.
- Hallmark static sweep: 0 FAIL, 0 REFLEX, 0 WARN. Its source record retained 9/9 links, 9/9 fields, 51/51 handlers and 1/1 test hooks.
- Fresh-context visual review found mobile control order, dark canvas continuation and counter alignment issues. All three were corrected and recaptured; the example action was restored as a visible button.
- `git diff --check` passed. No new dependencies.

Hallmark's Puppeteer render tier was unavailable because puppeteer-core was not installed. Actual screenshots, responsive checks and sampled contrast checks used Playwright CLI. Live hosted operations, other browsers and the SDK sample's appearance were not retested for this redesign. Earlier checks in other verification documents remain historical evidence.

## Screenshots

Investigation images use the real component with a synthetic controller and the bundled masked checkout recording. Native extension capture was checked separately by browser regressions.

- Dashboard: [light](screenshots/workbench-overview-light.png), [dark](screenshots/workbench-overview-dark.png).
- Investigation: [empty](screenshots/workbench-investigation-empty.png), [open dark report](screenshots/workbench-investigation-dark.png).
- Phone: [dashboard](screenshots/workbench-overview-phone.png), [recording controls](screenshots/workbench-recording-phone.png).

## Run and try it

From the repository root, start the dashboard:

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173/. Try the example, switch themes, open each evidence section, play/pause/seek replay, and export then reimport the report. Resize to a phone width and check navigation and evidence controls.

For the native investigation page, build the extension with `npm.cmd run build -w @reprokit/extension`, then reload the unpacked extension from `apps/extension/dist` in the browser's extension manager. Start the controlled demo in another terminal with `npm.cmd run dev:demo` at http://127.0.0.1:5174/. Record a deliberate failure, stop, review and export it. Keep each port free before starting its server.
