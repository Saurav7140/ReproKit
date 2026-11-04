# Investigation refresh and project deletion

Verified on 2026-11-04, following the dashboard refresh. Dashboard/extension source remains local and unpublished. The existing configured Supabase backend received one additive owner-only function; no existing projects or reports were deleted during implementation or verification.

## Project removal

Each project row has a visible trash button with a project-specific accessible name. The shared confirmation focuses Cancel, supports Escape and explains that the project, all hosted reports and website intake settings are permanently removed. Local/downloaded reports are unaffected.

The dashboard first calls `delete_project` to verify backend support and ownership. An empty project is removed immediately. A nonempty project returns `project_not_empty`; the dashboard reads its validated owner-visible report metadata, removes each recording through the existing authenticated leased report-deletion API, then calls `delete_project` again. A missing migration stops before any reports are removed. The current account limit bounds the query to 100 reports. Unexpected cross-project rows are rejected.

The new [migration](../supabase/migrations/202611040003_project_deletion.sql) uses `auth.uid()`, a fixed search path, the existing owner advisory-lock convention and an owner check. It refuses removal while any report metadata remains. The existing foreign-key restriction also prevents project deletion from orphaning recordings. Website intake configuration cascades only once the project can be removed. No browser Storage permission, report DELETE grant, service key or new Edge Function was added.

Deletion can be partial if interrupted: removed reports cannot be restored, while remaining rows/leased cleanup work stay available for recovery. A busy lease may require waiting before retry. New reports arriving during deletion can prevent final project removal; disable the project's website intake first if submissions continue. The UI never claims completion until the final project operation succeeds.

The migration was installed on the already configured project `sjlhlbdqgcmgcmlbluag` using the existing authenticated CLI, without an unreconciled `db push` or reset. A read-only schema query verified `security definer`, an empty search path, authenticated execution and denied anonymous execution. A request using only the public key and a nonexistent test UUID confirmed the live REST API recognizes the function and rejects anonymous deletion (`401`, PostgreSQL `42501`). Existing account data was not used for a deletion test. Owner/other-user and remaining-report behavior were exercised in PostgreSQL tests; deletion/retry interaction was exercised with synthetic UI transport fixtures.

## Investigation experience

The actual extension `review.html` now starts with two clear choices: import a saved report, or learn how to record from the toolbar. A short three-step workflow explains open/record, review and export/save. After a recording or import, the shared evidence viewer is prominent and Report details is a native disclosure. Optional private-project connection and capture/privacy reference information are collapsed. Recording keeps Stop/Discard and real bounded counts visible. Local import cancellation, replacement/removal confirmations, drafts, masking and replay isolation remain in place.

The page shares the dashboard's appearance control and outline icons. System / Light / Dark works independently within the extension's origin; only the cosmetic setting is stored. Its report and connection remain in memory. Body text is explicitly 14px: the installed extension browser context otherwise reduced inherited text to about 10.5px. Original recording colours remain independent of the surrounding theme.

## Checks and visual review

- `npm.cmd run check`: TypeScript, all production builds and **51 passing core/recorder/PostgreSQL/server checks**, including the new owner-only project-deletion test.
- `npm.cmd run test:browser`: **45 passing product browser cases**. New cases cover project cancellation/focus/local preservation, nonempty deletion failure/retry, missing migration protection, and the actual extension's guidance, appearance, metadata disclosure and optional connection.
- After the final empty-layout adjustment: three focused capture/reload/foundation/investigation cases passed. After the text-size correction: the focused actual-extension layout case passed again, including its 14px assertion and refreshed screenshots. Final TypeScript and extension production build passed.
- `npm.cmd run test:browsers`: real **Chrome 156.0.8078.80** and **Edge 156.0.4314.58** capture, masking, export/import, replay, reproduction and SDK consent workflows passed using temporary profiles.
- Design source lint: **0 FAIL / 0 WARN**. The design skill's `probe`, `layout`, `app` and app-rule judges were run through Playwright on the actual installed extension at 1440/768/390px in both themes: **no findings in all six configurations**. This uses the same browser measurements rather than presenting an HTTP preview as extension evidence.

Primary design authority remains design-taste-frontend, **Framed sheet**, seed **537218669**: IBM Plex, neutral surfaces, teal loop mark and one shared outline icon set. No redraw, dependency or decorative motion was added. The first review moved the empty-page workflow below the primary import/record choices so Import appears promptly on phones. The subsequent measured tiny-text warning exposed Chromium's body font reduction and was corrected. Confirmation screenshots have readable copy, aligned panels, real sequential steps, reachable phone controls and no horizontal overflow. Project screenshots show synthetic fixture data; the investigation fixture is explicitly hand-authored and separate from the recorded dashboard example.

Screenshots include 1440/768/390px variants:

- Start: [light desktop](screenshots/investigation-start-light-1440.png), [dark phone](screenshots/investigation-start-dark-390.png).
- Open report: [dark desktop](screenshots/investigation-report-dark-1440.png), [dark tablet](screenshots/investigation-report-dark-768.png), [dark phone](screenshots/investigation-report-dark-390.png). The metadata form is opened here by the edit-preservation test; it is collapsed by default.
- Project trash control: [dark desktop](screenshots/project-delete-dark-1440.png), [light phone](screenshots/project-delete-light-390.png). Visible focus follows cancellation in these screenshots.

The owner's manual reproduction file was neither edited nor executed. Full endurance and clean-copy installation were not repeated for these UI/additive-database changes. Real-account project deletion was deliberately not exercised on existing data. A full first-visit interactive tour remains deferred. Existing chunk-size warnings remain; no performance or release-readiness claim is made.

## Run and check

Start the dashboard:

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173/?view=hosted, sign in and look beside each project name. Use a disposable project when testing confirmed deletion; cancellation is safe to try on an existing project. The current backend already has the migration, so this workspace needs no SQL setup.

The extension has been rebuilt into `apps/extension/dist`. Open `chrome://extensions` or `edge://extensions`, click **Reload** on ReproKit, close/export any old review tabs first, and choose **Open local reports** from its toolbar popup. A new review tab shows the revised investigation page. `npm.cmd run build -w @reprokit/extension` repeats the build when needed.

Check importing a report, changing appearance, expanding Report details and Save to a private project, and cancelling removal. To try a fresh capture, run `npm.cmd run dev:demo`, open http://127.0.0.1:5174/, start from the toolbar, trigger a failure and stop. The new report should open with evidence ready to inspect. Export local evidence before closing, reloading or reloading the extension.
