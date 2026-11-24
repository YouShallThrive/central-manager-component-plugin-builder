# Plugin repository

The plugin repository is the single place plugins are uploaded, versioned and released. Sites update from it automatically.

## Pages

- Staging: https://staging-plugin-builder.ystvps.com/repository
- Production: https://plugin-builder.ystvps.com/repository

## Workflow

- Click "Upload plugin" and drop the plugin zip. The zip must contain one folder named after the plugin (the slug) with the main PHP file inside it. The plugin name, version and requirements are read from that file's header.
- A new plugin asks for description, author, category and tags. A new version of an existing plugin only asks what changed.
- "Set as the current version" decides what sites receive. Turn it off to upload a version without releasing it.
- Expand a plugin to see every version. "Set as current" switches the released version, the download button gets that version's zip, and a non-current version can be deleted.
- Rolling a single site back is done on that site. WordPress never downgrades on its own, so changing the current version only affects sites that are behind it.

## Update API (public)

- Manifest of the current version: `https://<host>/wp-updates/<slug>.json`
- Zip of the current version: `https://<host>/wp-updates/<slug>.zip`
- Zip of one version: `https://<host>/wp-updates/<slug>/<version>.zip`

nginx in `frontend/nginx.conf` proxies `/wp-updates/` to the Convex HTTP actions.

## Data

- `customPlugins` holds the plugin. `version`, `fileStorageId` and `fileSize` mirror the current version, and `activeVersionId` points at it.
- `pluginVersions` holds every uploaded version with its zip, size, sha256, changelog and uploader.
- The manifest changelog is built from the version entries up to the current version, followed by the older free-text `changelog` on the plugin.
- `convex/migrations.ts` `backfillVersions` turns each plugin that existed before versions into its first version. It is idempotent and runs in the deploy workflow.

## Access

- Self sign-up is disabled. Accounts come from the Central Manager through SSO, and new accounts there need main admin approval first.
- Upload, set current and delete require a signed-in user.

## YST Manager plugin

- Source: `plugins/yst-manager`. Build a zip with `node scripts/build-plugin.mjs yst-manager`.
- The plugin's `Updater` polls `https://plugin-builder.ystvps.com/wp-updates/yst-manager.json` every 6 hours. A staging site can point at another repository with the `YST_MANAGER_UPDATE_URL` constant.
- "Check for updates" under YST Manager on the Plugins screen refreshes the check immediately.
- Every deploy publishes the bundled plugins (`scripts/publish-plugins.mjs`). A push to `staging` puts the version in the plugin header into the staging repository, and a push to `main` puts it into production. The new version becomes the current one. A version that already exists is skipped and never overwritten, so bump the version in `plugins/yst-manager/yst-manager.php` and add its README changelog section to release a change.

## Later

- Sites tab showing which sites run which version, fed by update check-ins from the plugin.
