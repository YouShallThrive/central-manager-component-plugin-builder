<?php
/**
 * Auto-enqueue of the plugin's standard asset slots.
 *
 * Every install ships ready-to-go slots (core structure, preserved
 * across updates by the Updater just like custom/):
 *   public/css/site.css  + public/js/site.js -> front-end
 *   admin/css/admin.css  + admin/js/admin.js -> wp-admin
 *
 * All four slots are always enqueued, even while empty, so they
 * are visible in the source and ready to go the moment a dev adds
 * code (Michael's requirement, v1.4.3).
 *
 * @package YST_Manager
 */

namespace YST_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Custom_Assets {

	public function register(): void {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_site_assets' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
	}

	public function enqueue_site_assets(): void {
		$this->enqueue_helpers();
		$this->enqueue_pair( 'site', 'yst-manager-site' );
	}

	public function enqueue_admin_assets(): void {
		$this->enqueue_helpers();
		$this->enqueue_pair( 'admin', 'yst-manager-admin' );
	}
	/**
	 * Global JS helpers (carried over from yst-site-plugin, ES6, no jQuery).
	 * Lives in assets/js/helpers.js — a core file OUTSIDE the preserved
	 * dirs so repo updates keep it current. Loaded on front-end AND
	 * wp-admin, and set as a dependency of the slot JS so the helpers
	 * are always defined before site/admin code runs.
	 */
	private function enqueue_helpers(): void {
		if ( wp_script_is( 'yst-manager-helpers', 'enqueued' ) ) {
			return;
		}
		wp_enqueue_script( 'yst-manager-helpers', plugins_url( 'assets/js/helpers.js', YST_MANAGER_DIR . 'yst-manager.php' ), [], YST_MANAGER_VERSION );
	}


	private function enqueue_pair( string $basename, string $handle ): void {
		$base = 'site' === $basename ? 'public' : 'admin';

		$css_rel = $base . '/css/' . $basename . '.css';
		$css     = YST_MANAGER_DIR . $css_rel;
		if ( is_readable( $css ) ) {
			wp_enqueue_style( $handle, plugins_url( $css_rel, YST_MANAGER_DIR . 'yst-manager.php' ), [], (string) filemtime( $css ) );
		}

		$js_rel = $base . '/js/' . $basename . '.js';
		$js     = YST_MANAGER_DIR . $js_rel;
		if ( is_readable( $js ) ) {
			wp_enqueue_script( $handle, plugins_url( $js_rel, YST_MANAGER_DIR . 'yst-manager.php' ), [ 'yst-manager-helpers' ], (string) filemtime( $js ), [ 'in_footer' => true ] );
		}
	}

}
