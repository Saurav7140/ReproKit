# ReproKit

Turn bugs into reproducible developer reports.

ReproKit helps developers collect evidence, review it locally, and explicitly share a portable report. The initial product targets web applications through a Chromium extension and a dashboard. No account or backend is needed for local capture/export/import. Optional hosted projects require authentication and explicit upload; Phase 5 live acceptance is complete for the configured project.

## Dashboard experience

The default Overview gives first-time visitors three real actions: import a report, open an on-demand masked example, or learn how to capture. An existing local report appears first when returning to Overview. Reports provides local investigation, Projects provides authenticated private storage, Capture explains extension and SDK setup, and Help & privacy collects reference material. Evidence stays prominent; editable title/description sit inside Report details. Local report and test drafts survive navigation, but still clear on reload.

Appearance uses a shared sun/moon pill to select Light or Dark directly, with a separate monitor icon for System. It retains the pre-paint preference and operating-system changes. Only the cosmetic preference is stored locally; captured replay retains its recorded colours. The example is a real extension recording of the synthetic controlled demo, clearly labelled and validated with the normal import boundary. A first-visit guided tour is deferred until the layout is approved; Capture and Help are available now.

Project lists include accessible trash controls and explicit irreversible confirmation. The dashboard verifies deletion support/ownership, removes each hosted report through the existing leased Storage API, then calls an owner-only empty-project deletion function. Concurrent arrivals or failures keep project metadata until recordings are gone; retry may follow partial removal. Website intake settings are removed with the project. Local and downloaded evidence is unaffected.

The extension investigation page follows the same visual direction: clear import/record choices, a short review workflow, optional collapsed project saving, disclosure-based metadata and capture/privacy help. It shares the appearance control and outline icons with the dashboard. Body text is explicitly 14px to avoid the browser extension page default reducing inherited text.

## This delivery

Phases 0–4: architecture, privacy decisions, local investigation, controlled demo, selected-tab Chromium capture and deterministic reproduction drafts. Capture starts explicitly, masks evidence before buffering and stays in a full extension page's memory. Stop/discard remain available. Navigation/reload ends capture; it never automatically resumes. New v4 reports add input-control metadata and Playwright-draft capability; versions 1–3 remain supported. v3/v4 retain safe resolved presentation. Old reports cannot recover discarded CSS or missing locator metadata.

Both viewers provide editable metadata, evidence counts, filtered/paginated timelines, errors, failed requests, context, isolated DOM replay, portable JSON, derived steps and editable Playwright source export. Short unique test IDs and unique control roles support locators; labels and values stay masked. Missing setup, values, routes, unsupported controls and assertions become explicit TODOs. Generated source never runs inside the viewer. Each local viewer holds one report/draft in memory; downloads persist until their owner deletes them. Synthetic fixtures remain explicitly labelled.

Phase 5 adds Supabase email/password confirmation/reset, single-owner projects, report lists and open/investigating/resolved status. Reviewed local reports upload explicitly through an authenticated server validator to private Storage. Hosted copies use the existing viewer; edits there remain local exports, while status persists. Limits are 25 projects and 100 reports per account, 20 upload attempts/hour and 5 MiB/report. Reads expire at 30 days; configured leased cleanup removes objects before metadata and retries partial work. Live isolation, deletion, partial failures and scheduled cleanup were verified; the owner confirmed real email links. See [setup](docs/hosted-setup.md) and [verification](docs/verification-phase5.md).

Phase 6 connects an open extension review page to the same account/project backend. Email/password sign-in is independent of the dashboard session and stays in page memory. Users select a project and explicitly upload saved/reviewed details; progress, useful errors, duplicate handling and an owner-only dashboard report link follow. Disconnect/offline/expired-session failures preserve the local report. The real extension-to-backend-to-dashboard workflow passed without new browser permissions or a website authentication bridge. Closing/reloading the review page still loses the local report and connection; export first. [Phase 6 verification](docs/verification-phase6.md).

Phase 7 adds the optional @reprokit/recorder workspace SDK and separate website sample on port 5176. The host supplies consent and the report trigger; explicit start/stop/discard shares extension privacy/limits. Stopped reports use the existing accessible review/export/replay and explicit write-only public submission, without website account tokens. Owners enable a single site origin and public key per project, rotate/disable intake, and read reports privately in the dashboard. Atomic 10-attempt hourly quotas and a 20-report project cap bound public acceptance; spoofed origins/keys and quota exhaustion remain documented risks. Real website capture → public intake → private owner review passed. [Run and test](docs/website-sdk.md), [evidence](docs/verification-phase7.md).

## Product boundaries

Phase 8 adds release preparation: current Chrome/Edge workflow evidence, privacy/compatibility/keyboard regressions, bounded recording measurements and actual five-minute endurance, responsive review, dependency notices and a fresh source-copy workflow without private configuration. Shared confirmation focus is restored on cancel. [Evidence and run checks](docs/verification-phase8.md), [release/owner checklist](docs/release-checklist.md). Source uses the MIT License and is prepared for private GitHub storage. Live hosting, a private security contact and public-intake upstream protection remain separate release decisions.

- Common report metadata is separate from platform-specific evidence and capability declarations.
- Web evidence can eventually include interactions, DOM replay, available errors and failed-request metadata. Missing or unsupported evidence is not a broken report.
- Replay shows captured behavior; it cannot restore authentication, server state, services, or the original environment.
- Generated Playwright tests are editable starting points, never guaranteed reproductions. Completing actions does not establish an expected outcome; the user supplies assertions.
- Desktop, Electron, mobile, and device capture require separate future integrations. There is no universal recorder or generic plugin framework.
- Website SDK work starts only after extension and dashboard workflows are complete.

## Audience and priorities

Developers investigating a bug, usually at a desktop and sometimes reviewing on a phone. Prioritize readable diagnostics, evidence provenance, honest capability gaps, keyboard access, and privacy before capture. No invented reports, vanity metrics, billing, AI services, or collaboration features.

See [build plan](docs/build-plan.md), [architecture](docs/architecture.md), and [privacy](docs/privacy.md).
