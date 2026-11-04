# GitHub source and future updates

Repository: [Saurav7140/ReproKit](https://github.com/Saurav7140/ReproKit), private, main branch. Original project source is [MIT licensed](../LICENSE). Website hosting and extension/package distribution are separate from storing source on GitHub.

The first upload contains the implemented web phases, dashboard/investigation refresh, project removal and icon appearance controls. Final publication checks passed TypeScript, all production builds and 51 core/recorder/PostgreSQL/server tests. Recent UI browser checks are recorded in the verification documents. Staged text was checked for active local keys and common secret formats; reviewed screenshots use synthetic data.

Environment files, installed dependencies, generated builds, test output, inspection artifacts, portable report exports and the owner's manual reproduction draft are ignored. The explicitly allowlisted dashboard example is a masked recording of the synthetic demo. A clone needs its own public hosted configuration only for optional hosted features; local recording/import/export works without it.

When you return to development, run the normal local servers and edit the source. To save an update from the project folder:

```powershell
git status
git add .
git diff --cached
git commit -m "Describe what changed"
git push
```

Review the staged diff before committing, especially newly added files. Run `npm.cmd run check` for code changes and the relevant browser checks for changed workflows. Do not commit private settings or real recordings. Git's author email for this repository uses the GitHub noreply address; global Git settings and the ancestor `C:/` repository were left unchanged.

Publishing source does not deploy a website, publish npm packages or submit an extension to a browser store. Keep third-party notices when distributing builds. Export open local reports before restarting/reloading the extension or its review page.
