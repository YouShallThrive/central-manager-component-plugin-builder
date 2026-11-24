<?php
/**
 * Admin-side hook loader.
 *
 * All wp-admin hooks go here. This class is only
 * instantiated when is_admin() is true, so nothing
 * in here runs on the public front-end.
 *
 * @package YST_Manager
 */

namespace YST_Manager\Admin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin_Loader {

	/**
	 * Register all admin hooks.
	 */
	public function register_hooks(): void {
		// NOTE: admin/css/admin.css + admin/js/admin.js are enqueued by
		// includes/Custom_Assets.php (always, on every wp-admin page).
		// add_action( 'admin_menu', [ $this, 'add_menu_pages' ] );
		// add_action( 'admin_init', [ $this, 'register_settings' ] );
	}

	/**
	 * Register admin menu pages.
	 */
	public function add_menu_pages(): void {
		// add_menu_page(
		// 	__( 'YST Manager', 'yst-manager' ),
		// 	__( 'YST Manager', 'yst-manager' ),
		// 	'manage_options',
		// 	'yst-manager',
		// 	[ $this, 'render_settings_page' ],
		// 	'dashicons-admin-generic',
		// 	80,
		// );
	}

	/**
	 * Render the main settings page.
	 */
	public function render_settings_page(): void {
		// Capability check.
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		// include YST_MANAGER_DIR . 'admin/views/settings.php';
		echo '<div class="wrap"><h1>' . esc_html__( 'YST Manager Settings', 'yst-manager' ) . '</h1></div>';
	}

	/**
	 * Register settings with the Settings API.
	 */
	public function register_settings(): void {
		// register_setting( 'yst_manager_settings_group', 'yst_manager_settings', [
		// 	'type'              => 'array',
		// 	'sanitize_callback' => [ $this, 'sanitize_settings' ],
		// ] );
	}
}
