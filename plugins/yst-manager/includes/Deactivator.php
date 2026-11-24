<?php
/**
 * Deactivation handler.
 *
 * Runs when the plugin is deactivated. Use it to
 * clear scheduled cron events, flush rewrite rules,
 * or remove transients. Do NOT delete user data here —
 * that belongs in uninstall.php.
 *
 * @package YST_Manager
 */

namespace YST_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Deactivator {

	/**
	 * Run on deactivation.
	 */
	public static function deactivate(): void {

		// ── Clear scheduled cron events ───────────────────
		// wp_clear_scheduled_hook( 'yst_manager_daily_cron' );

		// ── Flush rewrite rules ──────────────────────────
		// flush_rewrite_rules();

		// ── Remove transients ────────────────────────────
		// delete_transient( 'yst_manager_cache' );
	}
}
