# Website SDK: run and integrate

Phase 7 is implemented as the private workspace package **@reprokit/recorder**. It is consumed by a separate website, `apps/sdk-demo`, rather than the extension. No npm publication is required. All packages and frontend applications remain unpublished.

## Run this configured workspace

In separate PowerShell terminals, from ReproKit:

```powershell
npm.cmd run dev:sdk
```

```powershell
npm.cmd run dev
```

Open **http://127.0.0.1:5176/** for the website sample and **http://127.0.0.1:5173/?view=hosted** for the private dashboard. Use `127.0.0.1`, not `localhost`: the configured origin must match exactly. Sign into your existing account in the dashboard and select **Website SDK sample**. The extension and port 5174 demo are not needed for this flow.

The current project's separate `reprokit-public` function and additive migration are installed. A dedicated sample project/intake is enabled only for the loopback origin above. Its public endpoint and public project key are in ignored `apps/sdk-demo/.env.local`; your existing dashboard `.env.local` is preserved. No privileged key or user token belongs in the sample. To change, disable or rotate intake, select the project and open **Website SDK intake**. Rotation invalidates the old key; update the sample env and restart its server. It does not reset the hourly quota.

If a strict port is occupied, open the already-running site or stop that terminal with Ctrl+C before restarting. A different port also requires updating the allowed origin. Do not terminate an unknown process just to free a port.

## Manual checklist

1. Reload the sample. It says **Nothing is recording**. Open **Report a problem**: Start is disabled until consent is checked. Cancel must leave recording off. Importing/constructing the package starts no observer, timer or network request.
2. Consent and click **Start recording**. Check the visible recording indicator and Stop/Discard controls. Edit the synthetic email/notes, submit the deliberately broken order, then trigger **Throw error** and **Fail fetch (503)**. No report uploads while recording.
3. **Stop and review**. Inspect Timeline, Errors, Failed requests, Replay, Reproduction and Context. Captured text/values/URL paths/error messages are masked. Layout and basic colours remain; images, original fonts and other external assets do not. Short test IDs and origins can remain. The unsaved order is an intentional sample bug.
4. Edit the report title/description. Submit and Export stay disabled until **Save details**. Manually entered details are preserved as entered: review them for secrets. Export a `.reprokit.json` and try importing it into the dashboard's local viewer.
5. Click **Submit report**. The website needs no login. Sign into the dashboard, select **Website SDK sample**, **Refresh reports**, then open the submitted title. Check evidence/replay and change its status. A submitted website report is privately visible to the owning account only.
6. Before submission, disable networking in DevTools. Submit must fail without losing local review/export. Re-enable and retry. After success, duplicate clicks are disabled. Server retries of identical content return the same receipt and store one report; changed content under the same report ID conflicts.
7. Discard an active or stopped recording and confirm. It disappears from page memory. Submitted/downloaded copies remain separately controlled. Close/reload the page: recording never resumes and unsaved local data is lost. Removing/hiding the indicator ends capture.
8. In dashboard intake settings, disable intake and save. New submissions fail safely. Re-enable when needed. Rotate the key and verify the old configuration fails; update the sample's public env and restart. Use the dashboard **Delete hosted report** to remove test submissions and their stored objects.

Limits: **5 minutes / 10,000 combined events / 5 MiB** per capture, **10 public attempts/hour/intake**, **20 retained reports/project** for public intake, plus the existing 100-report/account cap. Attempts include malformed bodies and identical retries after a valid key/origin; preflights do not count. Hourly buckets use server time. Intake rotation preserves its stable counter identity. A failed upload can require waiting for its 15-minute work lease; unfinished reports count toward capacity until recovered/deleted/cleaned. Retention is 30 days with the existing 15-minute cleanup schedule; outages can delay physical deletion.

## Use the package in a host site

The package exports TypeScript source for the workspace bundler. A separate repository would need source vendoring or deliberate package/build preparation before installation; `npm install @reprokit/recorder` is not promised to work on the public registry.

```ts
import { createWebsiteRecorder, submitWebsiteReport } from '@reprokit/recorder';

const recorder = createWebsiteRecorder(); // Idle; no capture or networking.
const unsubscribe = recorder.subscribe(() => {
  const state = recorder.snapshot(); // status, report, events, bytes, reason
  // Render recording/review/error controls from this state.
});

// The host owns the trigger and consent UI. Call only after explicit informed consent.
startButton.addEventListener('click', () => {
  recorder.start({ consent: consentCheckbox.checked });
});
stopButton.addEventListener('click', () => recorder.stop());
discardButton.addEventListener('click', () => recorder.discard());

// Separate user action, after stopping and reviewing/saving report details.
submitButton.addEventListener('click', async () => {
  const report = recorder.snapshot().report;
  if (!report) return;
  try {
    await submitWebsiteReport(report, {
      endpoint: 'https://YOUR_PROJECT.supabase.co/functions/v1/reprokit-public',
      projectKey: 'OWNER_ENABLED_PUBLIC_UUID',
    });
  } catch {
    // Preserve the report; offer retry and local export.
  }
});

// On host teardown: unsubscribe(); recorder.dispose();
```

`start` requires `consent:true`, an idle recorder and a supported top-level secure HTTP(S) HTML page; only one recording may run in a page. `stop()` returns the report (also in snapshot), and is safe to repeat. `discard()` clears the in-memory report; discard/export before starting another. `dispose()` discards and removes subscriptions. Reload/navigation loses this same-page memory. Subscribe drives UI, not persistence. Mark host reporting controls with `data-reprokit-ui` so they are excluded from capture; mark sensitive app regions `data-reprokit-mask`. The shared recorder always masks text/inputs regardless. The visible built-in indicator is mandatory and detects removal. Review/export UI is host-provided; this sample reuses ReproKit's accessible viewer and confirmation dialog.

No automatic start, automatic submit, identity/session collection, background persistence, screenshots/video, authenticated-site restoration or source execution is provided. Diagnostics use shared page error/rejection listeners and completed Resource Timing rather than wrapping application fetch/XHR. Available metadata depends on browser support and cross-origin timing policy. Chromium is the tested browser; see [responseStatus](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming/responseStatus).

## Fresh-project backend setup

1. Complete [hosted setup](hosted-setup.md), including private bucket, auth and cleanup, then apply **both** migrations in order to a new database. The second is `supabase/migrations/202611040002_website_intake.sql`. Do not reapply the first migration on the configured existing project.
2. Build the shared server validator with `npm.cmd run build:hosted`. Deploy `reprokit-public` separately using the CLI appropriate to your version. For pinned CLI 3:

```powershell
npx.cmd --yes supabase@3.0.0 functions deploy reprokit-public --remote=YOUR_REF --use-api --no-verify-jwt --yes
```

3. Sign into the dashboard, select/create a project, expand **Website SDK intake**, enter an exact HTTPS origin (HTTP only for localhost/127.0.0.1), check enable and save. Each project has one allowed origin; use a separate project when separate quota/origin is needed. IPv6 origins are not supported in this phase.
4. Copy `apps/sdk-demo/.env.example` to `.env.local`, fill the two public routing values from that panel, and restart `npm.cmd run dev:sdk`. Local review/export works without them. A browser POST needs no Supabase API key or Authorization header.

## Public ingestion security model

`reprokit-public` is deliberately separate from the authenticated `reprokit` extension/dashboard API. Its only operations are `OPTIONS` and `POST ?key=UUID`. It returns `{accepted:true,receipt:<source-report-uuid>}`; never private project metadata, owner IDs, storage paths, signed reads or server report IDs. It provides no read/list/status/delete/cleanup capability. Private operations still verify bearer identity and ownership. [Supabase function auth modes](https://supabase.com/docs/guides/functions/auth).

**Project keys are public.** They identify a write destination, not a visitor or owner. They may appear in downloaded JavaScript, network requests and provider logs. Exact non-null Origin matching plus reflected CORS blocks unrelated browser origins; non-browser callers can forge Origin and copy the key. It proves neither consent nor report truth. See [Origin header behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin). The host must obtain consent and describe its own privacy/retention policy. A hostile host can alter observations; client masking is not a guarantee against malicious host code or deliberately fabricated uploads.

The service charges an atomic database counter **before reading a body**. It accepts only current v4 website-sdk reports, validates bounded streamed UTF-8 JSON with the same core schema, rejects unknown/active replay content, hashes canonical JSON and reserves server-owned paths under the existing owner lock. Report count and byte limits bound retained data. A lease, write-before-completion ordering, immutable duplicates and existing cleanup protect partial failures. Intake is rechecked during reservation, so disabling/rotating before reservation stops the write. An already reserved in-flight upload may complete after disable/rotation. Owners can disable or rotate; only authenticated owners can configure their intake. Direct table mutations, public configuration reads and client calls to service RPCs are denied by grants/RLS.

These are **bounded public ingestion controls, not comprehensive bot or denial-of-service protection**. An attacker can exhaust a legitimate intake's 10-attempt quota, submit fabricated but schema-valid content, fill its 20 slots and trigger repeated function/database requests even after the upload quota is exhausted. Twenty-five owner projects still share the 100-report account cap. SQL validation rejects malicious structure, not sensitive text deliberately entered in title/description. Logs, backups and compute/network charges have provider retention/billing outside report cleanup. There is no IP reputation, visitor identity or CAPTCHA in this phase. Before exposing intake broadly, put an upstream gateway/WAF/challenge in front, enforce project-wide invocation/body limits, monitor spend/abuse and revisit quotas. Do not treat CORS or a hidden project key as authentication.

## Automated verification

`npm.cmd run check` runs types, unit/database/server checks and builds. The explicit product browser suite in README includes `tests/sdk.spec.ts` and the dashboard intake case; transport fixtures are intercepted and do not consume your sample quota. The separate **opt-in** `npm.cmd run test:sdk:live` requires the ignored private `supabase/.env.test` described by hosted setup, valid public dashboard settings, and free ports 5173/5176. It starts its own local servers, creates a temporary confirmed synthetic account/project/intake, exercises real capture/public ingestion/private review/quota/rotation, and removes only its own fixtures. It never prints credentials. Keep private settings out of Git and remove them after the live gate. [Actual evidence and limitations](verification-phase7.md).
