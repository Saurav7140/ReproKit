# Third-party notices

ReproKit's own license is still an [owner decision](../LICENSE-STATUS.md). Dependency licenses do not select a license for this project.

Production Vite builds emit dependency notices alongside the files they cover: UI, capture content/page, replay and server validator have separate notices so later sub-builds cannot overwrite earlier attribution. Keep the generated notice files in an extension archive or frontend/server artifact. They include the package metadata and available license texts from the installed locked packages; inspect them when dependencies change.

Core dependencies include React, rrweb, Zod and the optional Supabase client. Vite's JS notices omit CSS/font imports and rrweb's npm packages omit their full license text. The UI builds therefore also emit `licenses/ibm-plex-sans.txt`, `licenses/ibm-plex-mono.txt` (copied from the installed font packages) and `licenses/rrweb.txt` (from the [rrweb 2.2.0 upstream license](https://github.com/rrweb-io/rrweb/blob/rrweb%402.2.0/LICENSE)). Locally bundled IBM Plex fonts retain their SIL Open Font License 1.1 and IBM copyright notice. Keep this folder with the generated notices. Development-only tooling is listed in package-lock.json and retains its own licenses.

No legal review or redistribution approval is implied. Before distributing a release, the owner must select the project license and check the generated notices, including the font license texts.
