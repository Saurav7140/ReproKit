# Dashboard refresh verification

Verified locally on 2026-11-04. This change reorganizes the dashboard and adds appearance preferences; no cloud schema, function, permissions or deployment changed.

## Experience

| Destination | The question it answers |
| --- | --- |
| Overview | Where do I start, or how do I return to my open report? |
| Reports | What happened in this local recording? |
| Projects | Where are my private saved reports and their status? |
| Capture | How do I record a problem? |
| Help & privacy | What does each area do, and what are the capture/storage limits? |

Overview offers import, an on-demand recorded example and capture setup. It shows an existing local report first. Reports keeps the evidence visible and moves editable metadata into **Report details**. Projects separates account setup, project selection, upload, saved reports and advanced website intake. The existing `?view=hosted` and project/report links continue to work.

System / Light / Dark is available under **Appearance** in the sidebar, or inside the mobile navigation menu. The cosmetic preference persists; no recording is written to local storage. A small pre-paint script applies it before React starts. System follows operating-system changes. Captured replay keeps its own presentation when dashboard appearance changes.

The bundled `apps/dashboard/src/examples/checkout.reprokit.json` is an actual extension recording of the controlled synthetic demo. It contains masked DOM evidence, a JavaScript error, failed requests and checkout actions. It is labelled as an example, validates through the normal parser, loads in a separate chunk on request and receives a new report ID when opened. It contains no customer evidence and must never be replaced with a real customer's recording. The hand-authored version 1 contract fixture remains a separate developer disclosure in Help.

## Checks run

- `npm.cmd run check`: TypeScript, all production builds and **50 passing core/recorder/PostgreSQL/server tests**.
- `npm.cmd run test:browser`: **40 passing browser cases** across capture, extension connection, dashboard, foundation, hostile imports, hosted UI, investigation, reproduction, rrweb and SDK.
- After the final browser-history correction, `npx.cmd playwright test tests/dashboard.spec.ts`: **7 passing dashboard cases**, including the added Back-during-example-load case; final dashboard build and TypeScript check passed. Together these runs cover 41 distinct product browser cases.
- `npm.cmd run test:browsers`: installed **Chrome 156.0.8078.80** and **Edge 156.0.4314.58** passed actual capture, masking, export/import, dashboard replay, reproduction and SDK consent workflows in temporary profiles.
- Design source lint: **0 FAIL / 0 WARN**. Production browser inspector on Overview at 1440, 768 and 390px: **0 FAIL / 0 WARN**, no allowances. The system resolved to dark during this inspection; explicit light screenshots were also reviewed.
- Both palettes were measured from actual computed tokens: all nine text/muted/link combinations against surface/ground/raised backgrounds exceed 4.5:1. Minimum light **5.43:1**, dark **7.68:1**. This is a targeted contrast measurement, not a claim of a complete accessibility audit.
- Capture, Help and signed-out Projects were additionally checked at 1440/768/390px in both themes without horizontal page overflow. Signed-in Projects uses intercepted, explicitly synthetic transport fixtures; no real sign-in/email/upload was performed for this UI task.

The new dashboard cases verify explicit example loading without POST requests, navigation/back behavior, collapsed metadata, dirty-edit preservation and replacement cancellation, persistent light/dark/system behavior, blocked preference storage, mobile dialog focus/Escape/resize, file/example loading races, cancellation of late file results and cancellation on browser Back. Existing regressions verify shared extension/SDK viewer behavior, isolated replay, privacy and generated-source export/execution.

The full product command excludes the owner's `tests/manual-repro.spec.ts`; it was left untouched. Five-minute endurance, clean-copy installation and live backend/email checks were not repeated because recorder, dependencies and backend behavior were unchanged. Their earlier evidence remains in the phase verification documents. Vite still reports the dashboard's existing main-chunk size warning (about 607 kB minified); the approximately 129 kB example is separate and loaded on demand.

## Visual review

Primary authority: design-taste-frontend app-screen workflow. Existing **Framed sheet**, seed **537218669**, retained with IBM Plex Sans/Mono, the loop mark and teal. No redraws or new dependencies. The signature evidence contract remains in the viewer, backed by actual report counts. Impeccable context loading failed with `cache_directory_failed`; PRODUCT.md and DESIGN.md were read directly. No independent Impeccable review pass is claimed.

The first screenshot review identified an unnecessary empty Continue investigating row and missing mobile product branding. The correction removes that row until a report exists, moves an existing report above setup actions, and keeps ReproKit in the mobile header. The confirmation review found clear primary actions, consistent block edges and spacing, neutral chrome, readable diagnostic values and folded phone navigation. There are no decorative charts or invented totals; report metrics derive from the report, and the nav count represents the single open local report. Workflow numbers indicate real sequential steps. No motion or chart legends require review.

Representative screenshots:

- Overview: [light desktop](screenshots/dashboard-overview-light-1440.png), [dark desktop](screenshots/dashboard-overview-dark-1440.png), [dark tablet](screenshots/dashboard-overview-dark-768.png), [light phone](screenshots/dashboard-overview-light-390.png).
- Investigation: [dark desktop](screenshots/dashboard-report-dark-1440.png), [dark phone with replay in the viewport](screenshots/dashboard-replay-viewport-dark-390.png).
- Projects: [light desktop](screenshots/dashboard-projects-light-1440.png), [dark phone](screenshots/dashboard-projects-dark-390.png), [signed-out dark desktop](screenshots/dashboard-hosted-entry-dark-1440.png). Saved report/account content here is synthetic UI fixture data.
- Guidance: [Capture phone](screenshots/dashboard-capture-entry-dark-390.png), [Help tablet](screenshots/dashboard-help-entry-light-768.png).

All named screenshot families include 1440/768/390px variants. Offscreen iframe pixels can be absent from Chromium full-page screenshots; the separate replay viewport screenshots show the rendered captured DOM. This is why the viewport image is used for phone replay evidence.

## Run and try it

From the repository folder:

```powershell
npm.cmd run dev
```

Open **http://127.0.0.1:5173/**. Use the root URL to start on Overview, rather than an old Projects bookmark. In a separate terminal, run `npm.cmd run dev:demo` only if testing a new extension capture; the bundled example does not need that server.

1. Choose **Open example report**. Inspect Timeline, Errors, Failed requests, Replay and Reproduction. The Playwright source remains an editable draft.
2. Expand **Report details**, make an edit and navigate to Overview and back. Verify it survives, then save/export anything to keep.
3. Change **Appearance** to Dark and Light; reload only after exporting local work. Check that the preference persists. Try System and change the OS theme.
4. Open **Projects**, sign in with your existing account and use the existing explicit upload/status/open flow. Project selection alone does not upload.
5. Narrow the browser or use a phone viewport; open/close the navigation menu, visit Capture and Help, and verify the controls remain reachable.

A first-visit guided tour is deferred until the layout is approved. Capture and Help provide guidance now. Local reports and test drafts remain in page memory and clear on reload or close; export them first. Nothing was published.
