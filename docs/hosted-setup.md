# Phase 5 Supabase setup

Phase 7 adds a second additive migration and a separate optional public function. The existing configured project already has both; do not reapply them. For a fresh project, first complete this hosted setup, then follow [Website SDK setup](website-sdk.md#fresh-project-backend-setup). Public intake never replaces authenticated extension/dashboard uploads.

Phase 5 is verified for the current configured project as of 2026-11-04. The existing migration was inspected, and the authorized function, Auth redirects, Vault secrets and cleanup schedule are installed. The dashboard and extension remain local and unpublished. Do not reapply the initial migration to this existing project. The steps below are the reproducible setup for a new checkout/project; GitHub source does not contain the private environment files or a Supabase account. Local recording, import, replay and Playwright export work without hosted setup.

## Project-deletion upgrade

The configured project now also has [202611040003_project_deletion.sql](../supabase/migrations/202611040003_project_deletion.sql). For an existing installation with the first two migrations, inspect and run only this additive file once in the SQL Editor. It adds an owner-only `delete_project` RPC, which refuses projects with remaining report metadata. The dashboard removes actual recording objects through the existing report API first, then calls it again. Intake settings cascade with the empty project; no direct Storage policies or client report-delete grants are added. A missing function is detected before any reports are removed. Do not use an unreconciled `db push` on a manually initialized project. [Verification](verification-investigation-projects.md).

## 1. Create the project and public configuration

1. Open [Supabase Dashboard](https://supabase.com/dashboard), sign in, choose **New project**, select your organization, and name the project **ReproKit**. Use a new dedicated test project while verifying this phase.
2. Choose a nearby region and a strong database password. Keep that password in your password manager. Wait until provisioning finishes.
3. In the project's **Connect** dialog or project API settings, find the **Project URL** and **publishable key** (`sb_publishable_…`). A legacy **anon** key also works. The reference is the part before `.supabase.co` in the URL.
4. Edit `apps/dashboard/.env.local`, preserving any existing values. Add:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
```

Use the public key only. A secret key (`sb_secret_…`), legacy service-role key, database password or access token must never enter browser configuration or chat. The Vite config checks the client key before bundling. Restart Vite after editing environment variables. Both public values may be shared for setup help, or simply report “env configured.”

## 2. Apply the schema

In the new project's **SQL Editor**, open a new query, paste the contents of [202611040001_hosted_reports.sql](../supabase/migrations/202611040001_hosted_reports.sql), inspect it, and run it **once**. It creates owner projects/reports, private mutation functions, RLS, rate counters and the private `recordings` bucket. It is an initial migration for a new project, not a reset or an idempotent upgrade script. Do not rerun it over existing tables. Save the query/migration history; do not subsequently run a CLI `db push` against this manually initialized project without reconciling migration history.

Check that `projects`, `reports`, and `ingest_limits` have RLS enabled, and **Storage → recordings** is private with a 5 MiB JSON limit. Do not add client Storage policies: reads/signing/writes go through the authenticated function. Do not delete `storage.objects` rows with SQL; the [Storage API must remove the actual objects](https://supabase.com/docs/guides/storage/schema/design).

## 3. Configure Auth

In **Authentication**, enable email/password signup and email confirmation. Under **URL Configuration** set:

- Site URL: `http://127.0.0.1:5173`
- Allowed redirect: `http://127.0.0.1:5173/?view=hosted`
- Allowed redirect: `http://127.0.0.1:5173/?view=hosted&recovery=1`

Use this same origin consistently, including the IP rather than `localhost`. The checked-in `supabase/config.toml` describes these local settings but does not apply them to a remote project.

For real signup/reset mail, configure your SMTP provider under Auth email settings. Supabase's default sender currently permits only organization-team addresses and two messages/hour; it cannot verify arbitrary users' signup/reset flows. See [official SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp). Open confirmation/reset links in the same browser profile that requested them because the dashboard uses [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow). Expired/used links require a new request. Test delivery and redirects explicitly; a mocked browser flow or an admin-confirmed account does not prove email works.

## 4. Prepare server configuration and function

The current workspace has a generated `supabase/functions/.env` with the local origin and a random cleanup secret, already installed on its backend. Preserve it; the generation command below is for a fresh checkout.

Copy `supabase/functions/.env.example` to `supabase/functions/.env` **only if that destination does not already exist**. Keep the dashboard origin as `http://127.0.0.1:5173`. Generate a cleanup secret without printing it:

```powershell
node -e "const fs=require('node:fs'); const p='supabase/functions/.env'; fs.writeFileSync(p,'REPROKIT_DASHBOARD_ORIGIN=http://127.0.0.1:5173\nREPROKIT_CLEANUP_SECRET='+require('node:crypto').randomBytes(32).toString('hex')+'\n',{flag:'wx'}); console.log('Created server configuration without displaying its secret.');"
```

Choose either copying/editing the example or this generation command. The generation command intentionally refuses to overwrite an existing file. Keep the secret local; it authorizes retention cleanup. Hosted functions receive their Supabase API keys automatically. The server supports modern injected `SUPABASE_PUBLISHABLE_KEYS` / `SUPABASE_SECRET_KEYS` dictionaries plus legacy key fallbacks; do not copy privileged keys into the dashboard. [Official server secrets](https://supabase.com/docs/guides/functions/secrets).

When you choose to deploy this backend, review the migration/function source first, then run from the repository root (replace `YOUR_PROJECT_REF`):

```powershell
npm.cmd run build:hosted
npx.cmd --yes supabase@3.0.0 login --agent=no --output-format text
npx.cmd --yes supabase@3.0.0 secrets set --remote=YOUR_PROJECT_REF --env-file supabase/functions/.env
npx.cmd --yes supabase@3.0.0 functions deploy reprokit --remote=YOUR_PROJECT_REF --use-api --no-verify-jwt
```

These are hosted changes. No dashboard/extension publication is needed. CLI 3.0.0 uses `--remote=REF`; the older `--project-ref` examples do not match this pinned CLI. `--use-api` bundles without Docker and was used for the verified deployment. The `npx --yes` flag allows the CLI package download; inspect the CLI's separate remote-change confirmations. Run login in your own interactive terminal: it opens the browser, then asks for the displayed verification code back in that terminal. `--agent=no --output-format text` prevents automatic agent detection from disabling its prompts. Keep the code and access token out of chat.

The function's gateway `verify_jwt=false` is deliberate: its handler calls `auth.getUser(bearerToken)` on **every user operation**, including signed reads. It separately checks the server cleanup secret for cron. Public keys and allowed origins never authenticate a user. Build the bundled shared validator before every function deployment; `npm.cmd run build` also does this.

## 5. Enable retention cleanup

In Supabase **Vault**, create these named secrets through the UI (avoid placing a secret in saved SQL query text):

| Name | Value |
| --- | --- |
| `reprokit_function_url` | `https://YOUR_PROJECT_REF.supabase.co/functions/v1/reprokit` |
| `reprokit_cleanup_secret` | The exact `REPROKIT_CLEANUP_SECRET` from your server `.env` |

Then inspect and run [schedule-cleanup.sql](../supabase/schedule-cleanup.sql) in the SQL Editor. It enables Cron/pg_net and schedules a batch every 15 minutes. It requires Vault and the named secrets first. The named job can be rescheduled by rerunning the schedule query; it is not a second independent job.

Check **Cron run history**, **Edge Function logs** and the pg_net HTTP response status. Enqueuing HTTP successfully does not prove cleanup succeeded. Healthy responses contain `failed: 0`. Failed objects/metadata remain queued, with a 15-minute lease before another attempt. Cleanup claims at most 50 reports per invocation; monitor failures and backlog. Ready reports become unreadable after 30 days even while cleanup is delayed; incomplete uploads older than an hour and unfinished deletions are also claimed. Physical deletion can lag with outages/backlog, and provider backups follow the provider's separate retention. Do not advertise a verified cleanup guarantee until the scheduler and real object deletion pass.

## 6. Run and inspect the dashboard

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5173 and choose **Projects**. Create/confirm an account, sign in, then create a project. In **Reports**, import an exported `.reprokit.json`, review it and save edited details. Return to **Projects**, select the project and click **Upload reviewed report**. Import/sign-in/project selection never uploads automatically. Phase 6 also supports direct reviewed extension upload; see [connection instructions](../README.md#connect-the-extension-and-upload).

Keep the demo in a separate terminal when recording/testing it:

```powershell
npm.cmd run dev:demo
```

If a port is occupied, use the existing dashboard/demo or stop its owning terminal with Ctrl+C. The auth callbacks and CORS above expect port 5173; changing it also requires updating those settings. Do not kill an unidentified process.

## 7. Acceptance checks

Local checks, with no cloud writes:

```powershell
npm.cmd run check
npm.cmd run test:hosted
npm.cmd run test:browser -- tests/foundation.spec.ts tests/capture.spec.ts tests/investigation.spec.ts tests/reproduction.spec.ts tests/rrweb-feasibility.spec.ts tests/hosted.spec.ts tests/connection.spec.ts
```

The product browser list excludes your manually edited `tests/manual-repro.spec.ts`. Run that file separately when you want to execute your exported test. Hosted UI tests use a separate fake-config Vite server on 5177 and intercept its API traffic; they are explicitly not hosted integration evidence. The strict-CSP case uses a production demo preview on 5178. Stop unrelated processes using 5177/5178 before those tests.

For automated **real hosted** acceptance, use a dedicated test Supabase project with the migration/function applied. Copy `supabase/.env.example` to `supabase/.env.test` without overwriting an existing file, then privately set its matching project reference, secret API key (or legacy service-role key) and cleanup secret. Public dashboard values must target the same project. Run only after reviewing the script:

```powershell
npm.cmd run test:hosted -- --run
```

This command makes external writes: it creates two synthetic confirmed accounts, uploads fixture reports, checks isolation, private Storage, malformed input, duplicates/conflicts, status, deletion, expiry and recovery of an interrupted upload. It invokes **project-wide eligible retention cleanup**, so use a dedicated project. It removes its own tracked objects before report/project/account deletion; cleanup errors leave synthetic owner UUIDs for retry. It never prints credentials or provider responses. It does not send email and does not prove scheduled invocation. A network timeout during user creation can leave an untracked synthetic account; inspect Auth users after failed runs.

Manual checks still required:

1. **Auth:** real signup email arrives, confirmation returns to Projects, wrong password/unconfirmed account fail usefully; sign-out clears hosted content; reset link lets you choose a new password and old password fails. Check an expired/used link too.
2. **Explicit upload:** import a new real demo recording, save details, upload once, retry the identical report without a duplicate; a changed same-ID payload is rejected. Inspect replay/timeline/reproduction in the stored copy after reloading and signing in.
3. **Account isolation:** use two browser profiles/accounts; each creates a project. Account B sees none of A's projects/reports and cannot read/update/delete A's known report ID. Anonymous recording URLs fail. Run the live script for API/Storage enforcement beyond UI hiding.
4. **Expiry/failure:** disable network before upload, confirm local content remains, reconnect and retry. Exercise expired authentication/refresh. Provider-side partial-write/deletion failure is covered locally with fault-injected handlers; verify recovery against actual service failures before claiming that live gate complete. In-progress work may require waiting for the displayed 15-minute lease.
5. **Status/deletion:** cycle open → investigating → resolved, reload and check persistence; cancel deletion, then confirm deletion and verify both metadata and Storage object disappear. Local/downloaded copies remain.
6. **Retention:** run the opt-in expiry/interrupted-upload checks, then verify the actual scheduled job calls the function and removes a test-owned expired report/object. Monitor HTTP failure/backlog as described above. Never edit/delete other users' objects to test this.

These gates passed for the current project: live service/Storage, scheduled deletion and real post-write/post-delete failure recovery were checked by the agent; the owner confirmed email delivery/links. Phase 6's direct extension flow and Phase 7's separate public intake are also verified; private operations still require bearer authentication and ownership checks. Repeat the checklist for a new project or material backend change. [Phase 8](verification-phase8.md) records local hardening and release checks without reprovisioning this backend.
