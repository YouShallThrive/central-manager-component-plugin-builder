# custom/ — site-specific code

Put this site's customizations here, **one feature per file** (e.g.
`portfolio-cpt.php`, `allow-svg.php`). Every `.php` file in this folder is
loaded automatically by the plugin.

- `includes/` belongs to the core plugin and is **replaced** on every update.
- `custom/` belongs to this site and **survives** updates: the updater backs
  it up to `wp-content/uploads/yst-manager-custom-backup/` before an update
  and restores it after.

Reusable fixes that are not loaded by default live in the plugin's `snippets/` folder; copy one in here to enable it for this site.

Site-wide CSS/JS goes in the plugin's standard slots (`public/css/site.css`,
`public/js/site.js`, `admin/css/admin.css`, `admin/js/admin.js`) — core
auto-enqueues them, and they are preserved across updates just like this
directory. Anything needing its own enqueue logic can still be done from a PHP file
here.
