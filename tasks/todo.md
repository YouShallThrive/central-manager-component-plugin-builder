# Plugin repository: upload, versions, automatic updates

## Plan

- [x] Add the pluginVersions table and activeVersionId on customPlugins
- [x] Upload action that reads the plugin header from the zip
- [x] Register, set current and delete version mutations, plus upload cleanup
- [x] Manifest and zip endpoints serve the current version, plus a per-version zip
- [x] nginx proxy for /wp-updates and a bigger upload size limit
- [x] Repository page: upload dialog, versions panel, copy update URL
- [x] Disable self sign-up on the plugin builder
- [x] YST Manager 1.5.0 with a "Check for updates" link; source in plugins/yst-manager
- [x] Typecheck app and convex
- [ ] Central Manager: user approval dashboard (separate repo)
- [ ] Push to staging, run the backfill, test upload, set current and a site update
- [ ] Production roll (only when told)

## Second round

- [ ] Site check-ins from the plugin and a Sites tab with installed versions
