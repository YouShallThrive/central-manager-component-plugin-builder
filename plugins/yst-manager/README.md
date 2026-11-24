# YST Manager

A blank-slate WordPress plugin boilerplate built for the YouShallThrive team. Performance-first, developer-friendly, and designed as the foundation for all custom YST plugins.

## Why This Boilerplate?

- **Zero front-end overhead** — Admin code never loads on the public site (and vice-versa)
- **Conditional asset loading** — CSS/JS only enqueue on pages that need them
- **PSR-4 autoloading** — Classes load on demand; unused code stays on disk
- **WP 6.4+ / PHP 8.1+** — Modern standards, namespaces, typed properties
- **Ready for teams** — Consistent structure every developer already understands

## Architecture

```
yst-manager/
├── yst-manager.php          # Main bootstrap — constants, autoloader, activation hooks
├── uninstall.php            # Cleanup on uninstall (delete options, tables, etc.)
├── includes/
│   ├── Plugin.php           # Singleton orchestrator — splits hooks by context
│   ├── Activator.php        # Runs on activation (create tables, set defaults)
│   ├── Deactivator.php      # Runs on deactivation (clear crons, flush rules)
│   ├── Helpers.php          # Static utility functions
│   ├── Shortcodes.php       # All shortcodes ([current_year], ...)
│   ├── Updater.php          # Self-hosted updates from the YST plugin repository
│   ├── Admin/
│   │   └── Admin_Loader.php # All wp-admin hooks (menus, settings, admin assets)
│   └── Frontend/
│       └── Frontend_Loader.php  # All public hooks (front-end assets, shortcodes)
├── admin/
│   ├── css/                 # Admin stylesheets
│   ├── js/                  # Admin scripts
│   └── views/               # Admin PHP templates (settings pages, etc.)
├── public/
│   ├── css/                 # Front-end stylesheets
│   └── js/                  # Front-end scripts
├── custom/                  # Site-specific code (auto-loaded, survives updates)
├── snippets/                # Reusable hook files and CSS (NOT loaded; copy into custom/ per site)
└── languages/               # Translation .pot/.po/.mo files
```

## Performance Best Practices (Built In)

### 1. Context-Separated Hooks
The `Plugin::boot()` method checks `is_admin()` and only instantiates the relevant loader:

```php
if ( is_admin() ) {
    $admin = new Admin\Admin_Loader();
    $admin->register_hooks();
}

if ( ! is_admin() ) {
    $public = new Frontend\Frontend_Loader();
    $public->register_hooks();
}
```

### 2. Conditional Asset Enqueueing
Admin assets only load on YOUR settings page (not every admin page):

```php
public function enqueue_assets( string $hook_suffix ): void {
    if ( 'toplevel_page_yst-manager' !== $hook_suffix ) {
        return;  // Not our page — skip
    }
    wp_enqueue_style( ... );
}
```

Front-end assets only load where needed:

```php
public function enqueue_assets(): void {
    if ( ! is_singular( 'post' ) ) {
        return;  // Not a single post — skip
    }
    wp_enqueue_script( ... );
}
```

### 3. Lazy Autoloading
Classes are loaded only when first used. If a visitor never triggers the admin code path, those files never get `require`'d.

### 4. REST API On-Demand
REST routes register only during REST requests (`rest_api_init` hook), not on every page load.

## How to Use

### Starting a New Plugin
1. Copy this folder and rename it (e.g., `yst-client-portal`)
2. Find-and-replace across all files:
   - `yst-manager` → `yst-client-portal` (text domain, slug)
   - `yst_manager` → `yst_client_portal` (function/option prefix)
   - `YST_MANAGER` → `YST_CLIENT_PORTAL` (constants)
   - `YST_Manager` → `YST_Client_Portal` (namespace)
3. Update the plugin header in the main `.php` file
4. Start building!

### Adding Features
- **Admin settings page**: Uncomment the hooks in `Admin_Loader.php`
- **Custom post type**: Uncomment `register_post_types()` in `Plugin.php`
- **REST API endpoint**: Create a controller in `includes/Rest/` and register in `register_rest_routes()`
- **WP-CLI command**: Create in `includes/Commands/` and register in the CLI block of `boot()`
- **Cron job**: Schedule in `Activator::activate()`, clear in `Deactivator::deactivate()`
- **Shortcode**: Add the handler in `includes/Shortcodes.php` and register it in `Shortcodes::register()`

### Snippets

`snippets/` holds reusable fixes that are not loaded automatically. To use one on a site, copy the file into that site's `custom/` folder (PHP) or paste it where its README says (CSS), adjust the selectors listed in `snippets/README.md`, then purge the cache.

| Snippet | Purpose |
|---|---|
| `wpforms-scroll-header-offset.php` | Keeps a fixed header (and the admin bar) from covering the WPForms confirmation message or validation errors after submit. |
| `wpforms-loading-indicator-hidden-submit.css` | Shows WPForms' own spinner while a form sends when its native submit button is hidden and submitted by a custom button. |

### Shortcodes

| Shortcode | Output |
|---|---|
| `[current_year]` | The current year, localized via `date_i18n( 'Y' )` — e.g. for footer copyright lines. |

## Updates

The plugin updates itself from the YST plugin repository — new versions show up
in wp-admin → Plugins like any wordpress.org update.

- Update host: `https://plugin-builder.ystvps.com/wp-updates`
- Manifest: `/wp-updates/yst-manager.json` · Package: `/wp-updates/yst-manager.zip`
- Override the host with the `YST_MANAGER_UPDATE_URL` constant or the `yst_manager_update_url` filter (e.g. point staging at the preview repository).
- Manifest responses are cached for 6 hours (`yst_manager_update_manifest` site transient).

## WordPress Version Compatibility
- **Minimum**: WordPress 6.4
- **Tested up to**: WordPress 6.8
- **PHP**: 8.1+

## Security Checklist
- ✅ `ABSPATH` check on every file
- ✅ Capability checks on all admin pages
- ✅ Nonces for form submissions (add where needed)
- ✅ `sanitize_text_field()` / `esc_html()` / `esc_attr()` patterns in Helpers
- ✅ Prepared SQL via `$wpdb->prepare()` (in Activator example)
- ✅ Clean uninstall via `uninstall.php`

## License
GPL-2.0-or-later


## Changelog

### 1.3.0
- New protected `custom/` folder for site-specific code (auto-loaded,
  preserved across updates).

## 1.5.0 (2026-11-24)
- Plugins screen: new "Check for updates" link under YST Manager clears the cached manifest, asks the plugin repository for the current version right away and shows the result in an admin notice.

## 1.4.5 (2026-11-20)
- New `snippets/` folder with reusable, opt-in fixes (not auto-loaded): `wpforms-scroll-header-offset.php` (fixed header covering the WPForms confirmation or errors after submit) and `wpforms-loading-indicator-hidden-submit.css` (WPForms spinner when the native submit button is hidden). See `snippets/README.md`.

## 1.4.4 (2026-08-12)
- Removed dead commented-out enqueue boilerplate from Admin_Loader and Frontend_Loader (leftover skeleton code that never ran and made it look like admin/public assets were disabled). The active enqueue for all four asset slots lives in includes/Custom_Assets.php.

## 1.4.3 (2026-08-11)
- Global JS helpers moved from inline output to a real core file: assets/js/helpers.js (loaded front-end + wp-admin, still a dependency of the slot JS).
- Asset slots (public/css/site.css, public/js/site.js, admin/css/admin.css, admin/js/admin.js) are now always enqueued, even while empty, so they are visible in the source and ready for code.

## 1.4.2 (2026-08-10)
- Asset slots moved out of custom/ into core structure: public/css/site.css, public/js/site.js, admin/css/admin.css, admin/js/admin.js. Updater now preserves custom/, public/ and admin/ across updates.

## 1.4.1 (2026-08-10)
- Global JS helpers `yst_data_check()` / `yst_data_set()` (carried over from yst-site-plugin, ES6, no jQuery) printed inline on front-end and wp-admin; custom asset JS depends on them.

## 1.4.0 (2026-08-10)
- Standard asset slots on every install: `custom/assets/site.css|js` (front-end) and `admin.css|js` (wp-admin), auto-enqueued by core (always, since 1.4.3).

