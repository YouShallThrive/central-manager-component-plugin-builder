<?php
/**
 * Plugin Name:       YST Manager
 * Plugin URI:        https://ystagency.com/
 * Description:       A blank-slate boilerplate for building custom WordPress plugins. Lightweight, performance-first, and developer-friendly.
 * Version:           1.5.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            YouShallThrive
 * Author URI:        https://ystagency.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       yst-manager
 * Domain Path:       /languages
 *
 * @package YST_Manager
 */

// Abort if called directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/*──────────────────────────────────────────────────────────────
 * 1. CONSTANTS — define once, reference everywhere
 *────────────────────────────────────────────────────────────*/

define( 'YST_MANAGER_VERSION', '1.5.0' );
define( 'YST_MANAGER_FILE', __FILE__ );
define( 'YST_MANAGER_DIR', plugin_dir_path( __FILE__ ) );
define( 'YST_MANAGER_URL', plugin_dir_url( __FILE__ ) );
define( 'YST_MANAGER_BASENAME', plugin_basename( __FILE__ ) );

/*──────────────────────────────────────────────────────────────
 * 2. AUTOLOADER — loads classes from includes/ on demand
 *    No code runs until a class is actually used.
 *────────────────────────────────────────────────────────────*/

spl_autoload_register( function ( string $class ) {
	// Only handle our namespace.
	$prefix    = 'YST_Manager\\';
	$base_dir  = YST_MANAGER_DIR . 'includes/';

	if ( 0 !== strpos( $class, $prefix ) ) {
		return;
	}

	$relative = substr( $class, strlen( $prefix ) );
	$file     = $base_dir . str_replace( '\\', '/', $relative ) . '.php';

	if ( file_exists( $file ) ) {
		require_once $file;
	}
} );

/*──────────────────────────────────────────────────────────────
 * 3. ACTIVATION / DEACTIVATION / UNINSTALL
 *────────────────────────────────────────────────────────────*/

register_activation_hook( __FILE__, [ 'YST_Manager\\Activator', 'activate' ] );
register_deactivation_hook( __FILE__, [ 'YST_Manager\\Deactivator', 'deactivate' ] );
// Uninstall logic lives in uninstall.php (loaded by WP core).

/*──────────────────────────────────────────────────────────────
 * 4. BOOT — create the plugin singleton and register hooks.
 *    Everything below runs on `plugins_loaded` so WP core
 *    and all other plugins are already available.
 *────────────────────────────────────────────────────────────*/

add_action( 'plugins_loaded', function () {
	\YST_Manager\Plugin::instance()->boot();
} );
