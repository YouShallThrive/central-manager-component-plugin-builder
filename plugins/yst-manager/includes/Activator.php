<?php
/**
 * Activation handler.
 *
 * Runs once when the plugin is activated. Use it to
 * create database tables, set default options, or
 * flush rewrite rules.
 *
 * @package YST_Manager
 */

namespace YST_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Activator {

	/**
	 * Run on activation.
	 */
	public static function activate(): void {

		// ── Set default options ───────────────────────────
		if ( false === get_option( 'yst_manager_settings' ) ) {
			add_option( 'yst_manager_settings', [
				'version' => YST_MANAGER_VERSION,
			] );
		}

		// ── Create custom DB tables ──────────────────────
		// self::create_tables();

		// ── Flush rewrite rules (if registering CPTs) ────
		// flush_rewrite_rules();
	}

	/**
	 * Example: create a custom table.
	 */
	private static function create_tables(): void {
		global $wpdb;
		$charset = $wpdb->get_charset_collate();
		$table   = $wpdb->prefix . 'yst_manager';

		$sql = "CREATE TABLE {$table} (
			id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
			created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id)
		) {$charset};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}
}
