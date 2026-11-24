<?php
/**
 * Core plugin class — singleton orchestrator.
 *
 * Registers admin and public hooks only when the
 * corresponding context is active, so zero front-end
 * overhead when the visitor is not in wp-admin.
 *
 * @package YST_Manager
 */

namespace YST_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Plugin {

	/** @var self|null */
	private static ?self $instance = null;

	/**
	 * Get or create the singleton instance.
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/** Private constructor — use instance(). */
	private function __construct() {}

	/**
	 * Register all hooks. Called once from plugins_loaded.
	 *
	 * Hooks are split by context so admin-only code never
	 * loads on the front-end and vice-versa.
	 */
	public function boot(): void {

		// ── Shared hooks (always needed) ──────────────────
		( new Shortcodes() )->register();
		( new Updater() )->register();
		( new Custom_Assets() )->register();
		$this->load_customizations();
		// add_action( 'init', [ $this, 'register_post_types' ] );
		// add_action( 'init', [ $this, 'load_textdomain' ] );

		// ── Admin-only hooks ──────────────────────────────
		if ( is_admin() ) {
			$admin = new Admin\Admin_Loader();
			$admin->register_hooks();
		}

		// ── Front-end-only hooks ──────────────────────────
		if ( ! is_admin() ) {
			$public = new Frontend\Frontend_Loader();
			$public->register_hooks();
		}

		// ── REST API (loads only when REST request) ───────
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );

		// ── CLI commands (WP-CLI only) ────────────────────
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			// \WP_CLI::add_command( 'yst-manager', Commands\Manager_Command::class );
		}
	}

	/**
	 * Load site-specific customizations from custom/.
	 *
	 * Every .php file in custom/ is loaded (one feature per file,
	 * same convention as includes/). This folder is preserved across
	 * plugin updates by Updater — core owns includes/, the site owns
	 * custom/. Never put site-specific code anywhere else.
	 */
	private function load_customizations(): void {
		$files = glob( YST_MANAGER_DIR . 'custom/*.php' );
		if ( empty( $files ) ) {
			return;
		}
		sort( $files );
		foreach ( $files as $file ) {
			if ( 'index.php' === basename( $file ) ) {
				continue;
			}
			require_once $file;
		}
	}

	/**
	 * Load the plugin text domain for translations.
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain(
			'yst-manager',
			false,
			dirname( YST_MANAGER_BASENAME ) . '/languages'
		);
	}

	/**
	 * Register custom post types / taxonomies.
	 */
	public function register_post_types(): void {
		// Example:
		// register_post_type( 'yst_manager_item', [ ... ] );
	}

	/**
	 * Register REST API routes.
	 * Only loaded when WP processes a REST request.
	 */
	public function register_rest_routes(): void {
		// Example:
		// $controller = new Rest\Example_Controller();
		// $controller->register_routes();
	}

	/**
	 * Get a plugin option with a default fallback.
	 *
	 * @param string $key     Option key within the settings array.
	 * @param mixed  $default Fallback value.
	 * @return mixed
	 */
	public static function get_option( string $key, mixed $default = null ): mixed {
		$options = get_option( 'yst_manager_settings', [] );
		return $options[ $key ] ?? $default;
	}
}
