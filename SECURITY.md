# Security reporting

Report suspected vulnerabilities privately to the repository owner through a contact channel you already trust. A public security inbox/advisory URL has not been established; the owner must add one before public release. Do not post private recordings, signed URLs, authentication tokens, personal data or exploit details in a public issue. No response-time promise or bug bounty is established.

Include the affected source/build version, browser/version, a minimal synthetic reproduction, expected versus observed behavior, and the boundary that may be affected. Redact credentials and tenant/user identifiers. A `.reprokit.json` can still contain manually entered descriptions, origins and short test IDs: inspect it before sending. Ask for a secure transfer method if sensitive evidence is necessary; do not upload real customer sessions to the public intake just to demonstrate a vulnerability.

Current review scope is the local Chromium extension, dashboard and optional website SDK. Capture is explicit and bounded; page messages are untrusted; replay is isolated and cannot run captured scripts or fetch original assets. The authenticated API validates user identity/ownership before private operations. Public website intake is a separate, opt-in write destination with forgeable public keys/origins, quotas and storage caps. It is not bot protection or proof of visitor consent.

Thirty-day report retention and leased cleanup do not cover downloaded files, provider logs or backups. Short-lived signed reads are bearer access until expiry. Local reports and extension connections live only in the open page's memory. Do not store privileged server keys in `VITE_` variables or disable validation/CSP to improve replay fidelity.

Before broad public hosting, the owner must configure upstream public-intake abuse/invocation limits, monitor provider spend and cleanup failures, confirm mail configuration/retention, preserve the license notices and publish a private security contact. [Privacy contract](docs/privacy.md), [known limitations](docs/known-limitations.md), [public ingestion threat model](docs/website-sdk.md#public-ingestion-security-model).
