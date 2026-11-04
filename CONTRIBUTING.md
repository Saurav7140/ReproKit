# Contributing to ReproKit

Use Node 22.12+ and npm 10+. Install locked dependencies with `npm.cmd ci`, install the browser with `npx.cmd playwright install chromium`, then run `npm.cmd run check` and `npm.cmd run test:browser`. On other shells, `npm`/`npx` work normally. The normal browser command selects product tests explicitly; your exported/manual `.spec.ts` files are not silently added to that suite.

For local use, start `npm.cmd run dev` and `npm.cmd run dev:demo` separately. Load **apps/extension/dist** through Chrome/Edge's extensions page in Developer mode, record the controlled demo on port 5174, stop, export, and import in the dashboard on port 5173. The optional website SDK sample is `npm.cmd run dev:sdk` on 5176. Local capture/review/export needs no `.env`, account, database, Docker or mail provider. [Full setup](README.md), [hosted setup](docs/hosted-setup.md), [website SDK](docs/website-sdk.md).

Keep changes small and preserve the existing Framed sheet/IBM Plex interface. Add a focused check for nontrivial behavior. Capture, schema or replay changes must reach privacy allowlists, buffer limits, compatible imports, the bundled server validator and both viewers. `check` builds that validator before running server tests. Do not loosen a trust boundary to make a test pass. Do not execute generated Playwright source in a viewer, invent assertions, add persistent recording/token storage, automatic uploads or broader browser permissions.

Use synthetic data only in tests, fixtures and screenshots. Never commit `.env` files, privileged keys, tokens, real reports, browser profiles or sensitive logs. `.env.example` contains placeholders only. Public project keys route writes; they do not authenticate a person. Do not run privileged live tests without understanding their dedicated-project setup and cleanup behavior. No test should remove another owner's data.

Run `npm.cmd run test:clean` to verify a clean source copy without private configuration. `npm.cmd run test:browsers` additionally requires installed Chrome and Edge and opens temporary native browser windows. `npm.cmd run test:performance` takes about five minutes because one case measures actual elapsed recording time. [Verification and limits](docs/verification-phase8.md).

Before a PR, explain the user-visible problem, change and relevant verification. Keep user edits and manual reproduction drafts intact. Do not publish, push, change hosted infrastructure or select the project license merely as a side effect of a local change.

Keep the Git repository rooted inside this project. Check `git rev-parse --show-toplevel` and the staged file list before committing; never stage or push an ancestor directory. Preserve ignored local configuration and manual reproduction drafts.
