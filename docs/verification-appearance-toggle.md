# Appearance icon control

Implemented and verified locally on 2026-11-04 for both the dashboard and installed extension investigation page. No backend, recording permissions, report format or dependencies changed.

| Before | After | Why |
| --- | --- | --- |
| Appearance dropdown | Shared sun/moon pill with a circular selected state | Light and dark are directly accessible and recognizable. |
| System option inside the dropdown | Separate monitor icon with an accessible name, tooltip and pressed state | Automatic device appearance remains available. |
| Text selection as state feedback | Current theme highlighted on the sun/moon control | The control reflects the actual theme, including OS changes while System is selected. |

The existing Framed sheet direction (seed 537218669), IBM Plex and teal are retained; no redraw. The supplied reference informed the pill and circular selection, using the product's flat surfaces and existing outline icon set. Targets are 44px. Native buttons support Enter/Space, visible keyboard focus, accessible names and pressed states. There is no added motion. Light/dark/system preference persistence, pre-paint dashboard appearance and storage-failure recovery remain intact. Dashboard and extension preferences remain independent by origin.

Checks:

- Final TypeScript check and both production builds passed.
- Six focused browser cases passed: dashboard theme persistence/system changes/keyboard activation/replay colour preservation; mobile navigation; unavailable preference storage; project controls at responsive sizes; hosted report workflows; and actual-extension appearance, keyboard, readable layout and report-edit preservation.
- Source lint: **0 FAIL / 0 WARN**.
- The design skill's browser probes and app-rule judges measured the production dashboard and actual installed extension at 1440/768/390px, in light and dark: **no findings across all 12 configurations**. Screenshots were visually checked, including the mobile navigation drawer.
- The existing dashboard dev server was also checked without interrupting it. A separate production preview on port 5180 was used for final measurements and stopped afterward.

Screenshots:

- Dashboard control: [light](screenshots/appearance-dashboard-light.png), [dark](screenshots/appearance-dashboard-dark.png).
- Mobile navigation: [light](screenshots/appearance-dashboard-menu-light.png), [dark](screenshots/appearance-dashboard-menu-dark.png).
- Investigation control: [light phone width](screenshots/appearance-investigation-light-390.png), [dark phone width](screenshots/appearance-investigation-dark-390.png).

Refresh the dashboard to see the control. The extension has been rebuilt; export open work before reloading ReproKit at `chrome://extensions` or `edge://extensions`, then reopen its investigation tab. Click the sun for light, the moon for dark, or the monitor to follow the device.

The full recording/backend/endurance suites were not repeated for this UI-only change. The owner's manual reproduction test was untouched and unexecuted. Existing build chunk-size warnings remain.
