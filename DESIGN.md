# ReproKit design

## Current dashboard

The dashboard refresh preserves the Framed sheet direction (seed 537218669), IBM Plex, the loop mark and teal. Its question is now explicit: Where do I start, and where does my report live? Overview prioritizes an open report, then import/example/capture. Reports holds ephemeral investigation, Projects holds authenticated saved copies, Capture explains setup, and Help & privacy holds reference material. The on-demand example contains actual masked demo evidence, not invented metrics. A full guided tour is deferred.

The dashboard uses a 224px neutral sidebar, 64px top bar and 40px main horizontal padding at desktop size, with a 1200px content maximum. At 1000px the sidebar becomes a labelled native-dialog menu; the product name stays in the top bar. Phone margins are 16px and paired sections stack below 760px. Report metadata is a native disclosure so the evidence controls remain prominent. The advanced Website SDK intake and new-project form are disclosures rather than competing first actions.

Light tokens: ground #f5f7f9, surface #ffffff, raised #f7f8fa, text #19232d, muted #5c6673, border #e0e5eb and teal #1b6c80. Dark tokens: neutral ground #111315, surface #191c20, raised #20242a, text #edf0f4, muted #adb7c4, border #343b45 and teal #80cbd7. Primary actions use ink in light mode and pale ink in dark mode. System is the default; the appearance choice is applied before paint, persisted independently of reports and follows system changes. The replay surface keeps recorded colours.

The revised shell uses one outline icon set, flat surfaces, clear verbs, contextual empty states and no decorative charts, motion or new dependencies. Keyboard navigation, mobile dialog dismissal/resize, overlapping file/example loads, theme persistence and existing capture workflows are checked in [dashboard verification](docs/verification-dashboard.md).

The shared appearance control is a compact sun/moon pill with a teal circular selection and a separate monitor button for System. It replaces the dropdown on both surfaces. All three controls have accessible names, pressed states and 44px targets, with keyboard focus, native Enter/Space activation and no motion. The selected circle reflects the resolved theme while the monitor indicates automatic selection. [Toggle verification](docs/verification-appearance-toggle.md).

## Extension investigation and project management

The investigation refresh uses the same neutral framed surfaces, IBM Plex, teal loop mark and shared outline icons. The first question is: Do I already have a report, or do I need to record? Import/record choices lead the empty view. The three actual steps follow, while account connection and capture/privacy reference material stay in native disclosures. After import or capture, the evidence viewer leads and Report details is collapsed. Recording retains its prominent Stop/Discard controls and bounded counts. All states support Light / Dark / System; extension appearance is independent of the dashboard origin. Body text is explicitly 14px because Chromium extension pages otherwise reduce inherited body text.

Project rows pair a flexible project-name button with a permanent visible trash affordance, including a descriptive accessible label and focus state. Deletion first opens the shared native confirmation focused on Cancel; no deletion starts from the icon alone. Phone targets are 44px. The operation can remove multiple hosted reports and is described as irreversible and potentially partial if interrupted. The owner function refuses to remove projects with remaining report metadata. [Checks and screenshots](docs/verification-investigation-projects.md).

## Exports

The approved Hallmark redesign exports the existing ReproKit brand through `apps/shared/hallmark/tokens.css`, with shared foundations in `base.css` and evidence presentation in `workbench.css`. Dashboard and investigation share these tokens. Overview leads with a report intake row and example action; investigation uses compact metadata and a vertical evidence rail that wraps on phones. Recording keeps Stop and Discard above supporting guidance. The brand, privacy model and application wiring remain the existing system. [Checks and screenshots](docs/verification-workbench.md).

## Earlier phase decisions (historical)

Phase 8 keeps the same Framed sheet/IBM Plex direction. The bounded review corrects empty-state bottom spacing and native confirmation focus restoration, with desktop/tablet/phone report screenshots and actual Chrome/Edge replay. No layout redraw or motion was added. Source and production inspectors, keyboard labels/focus/return and overflow checks are recorded in [Phase 8 verification](docs/verification-phase8.md).

Phase 7's separate website sample retains the existing standalone grid, Framed sheet tokens, mark and IBM Plex. Its main question is “How do I report this problem with consent?” A host-owned Report a problem trigger reveals labelled consent and a disabled-until-consented Start; recording controls and the mandatory indicator remain visible, then the shared viewer leads to explicit Submit. Counts come from the buffer. The owner-only Website SDK intake disclosure leads with origin/enable/save, public routing values, rotation and concrete limits. Both stack and wrap at phone width. [Reviewed screenshots and checks](docs/verification-phase7.md).

Phase 6 adds a quiet “Save to a private project” section below local investigation. Evidence stays first; Connect reveals labelled account fields, then project selection and upload form one wrapping row. Progress/errors are inline and the saved-report link follows success, with no invented percentages or decorative motion. Existing Framed sheet/IBM Plex spacing and controls remain. Account/project text wraps on phones. Real extension screenshots at 1440/768/390px show a real capture and a temporary synthetic account against the live backend; that account/data were removed afterwards. [Phase 6 review](docs/verification-phase6.md).

Primary authority: design-taste-frontend app-screen workflow. Direction: **Framed sheet**, seed **537218669**, no redraws. The investigation surface is a workbench, not a marketing page.

## Data and jobs

- Each dashboard or extension investigation page holds zero or one ephemeral local report; hosted projects were added in Phase 5.
- One bundled synthetic report is a development fixture, separately labelled everywhere.
- Report identity, source, timestamps, event counts, evidence, capabilities, and limitations are the objects of investigation.
- Counts are computed from report arrays, never separately invented.
- A developer first asks: “What evidence explains this captured failure, and what can I share?”
- The dashboard puts local import first, then report identity, metadata, evidence counts and channel controls. The separately labelled synthetic development fixture appears only when no report is open.
- The extension asks: “Is my selected tab recording?” Its popup explains capture before start; the selected tab and full capture page show an unmistakable recording state with Stop and Discard.
- The demo asks: “Which deliberate failure should I trigger?” Each failure is independently actionable.
- Report diagnostics use milliseconds, ISO timestamps, and explicit source labels.
- Empty reports stay empty; unavailable replay and hosted features are stated plainly.

## Visual system

One pale blue-grey L-frame, white sheet inset 8px at right/bottom, 16px sheet corners, no shadows. Sidebar 228px; top bar 48px; sheet padding and section gap 24px. Flat panels use 8px corners, controls 6px. At 1440px: 228px sidebar + 1204px sheet + 8px inset = 1440px; sheet interior = 1204 - 2px border - 48px padding = 1154px. The main grid is minmax(0, 1fr) + 300px + 24px gap.

IBM Plex Sans (locally bundled) at 12/14/16/22px, weights 400/500/600. IBM Plex Mono has one job: diagnostics, identifiers, and code. Tabular figures throughout diagnostic counts. Teal #1b6c80 marks the ReproKit loop-shaped mark and evidence/capability signals. Ink #131416, muted #5d5f60, ground #f9fbfc, raised #f4f6f8, border #e8eaec. Negative #c4242a is reserved for errors. Near-black primary actions. No gradients, glows, illustrations, charts without data, or ornamental KPI tiles.

The product's signature element is its evidence contract: a compact list that places each diagnostic channel beside its actual availability. The loop mark evokes reproduce/review. The face choice is IBM Plex Mono on diagnostic artifacts.

## Behavior and accessibility

Visible focus; real links and buttons; one h1 per surface; semantic sections and tables; status messages announced; errors include recovery. No entrance animation. Feedback transitions only, removed under prefers-reduced-motion. Sidebar folds into labelled horizontal navigation at tablet widths; panels stack on phone, diagnostics wrap without page overflow. The popup is compact; investigation gets a full extension page.

Preserve this direction through Phase 3. Recording uses a flat dark red indicator with white controls, no pulsing or entrance motion. The capture page uses live bounded counts and explicit end reasons. After stopping it becomes the shared full investigation view: editable details, flat summary figures, text-labelled evidence controls and collapsed report JSON. No toolbar badge is used: the tab indicator and capture page are the recording surfaces, and closing the capture page stops the recorder.

The report title receives focus after import; native confirmation dialogs protect replacement/removal, focus Cancel first, and support Escape. Timeline/errors/requests are paginated at 50 rows, request tables scroll locally, and phone layouts stack fields/context. Replay is noninteractive evidence behind parent play/pause/seek controls; its fixed 480px desktop / 320px phone surface scales the masked source viewport. New v3 recordings retain safe resolved layout and basic colours, with generic local fonts and masked text. Original stylesheets/assets remain excluded. Old v2 recordings show an explicit explanation that a fresh recording is needed. Drafts survive dashboard navigation; replay stops while hidden. Current evidence and real capture screenshots are in docs/verification-phase3.md; earlier phase logs remain historical.

Phase 4 adds one Reproduction evidence pane in both viewers without redrawing the shell. Its question is “Which captured actions can become a test, and what must I supply?” Chronological steps lead, then explicit gaps, a labelled monospace textarea, download action and collapsed run instructions. No in-browser Run control exists. Source has local scrolling at narrow widths; surrounding explanations wrap. Draft edits survive evidence/dashboard navigation and are cleared with the report; they are downloaded separately from JSON. Existing zeros/counts remain derived from evidence. Actual desktop/tablet/phone captures are in docs/verification-phase4.md.

Phase 5 retains the Framed sheet/IBM Plex direction. Hosted projects asks “Which private report needs investigation?” A compact project list leads to explicit local-report upload, status and the existing viewer. Auth has labelled fields and inline recovery feedback; local work remains accessible. Project/report regions stack below 900px and controls wrap without page overflow. Signing out unmounts hosted evidence; failures preserve the local report. Concurrent local/hosted viewer labels use unique IDs. Initial screenshots use explicitly synthetic intercepted UI traffic; final live screenshots use a real captured report and temporary synthetic account against the actual backend. Viewport replay screenshots show the captured masked DOM; full-page shots can omit offscreen iframe pixels. Backend/email/scheduling results have separate live or owner-reported evidence rather than being inferred from screenshots. See docs/verification-phase5.md.
