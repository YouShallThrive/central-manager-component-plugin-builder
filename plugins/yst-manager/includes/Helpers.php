<?php
/**
 * Static helper / utility functions.
 *
 * Keep reusable, stateless functions here so every
 * other class can call them without creating objects.
 *
 * @package YST_Manager
 */

namespace YST_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Helpers {

	/**
	 * Sanitize a settings array.
	 *
	 * @param array $input Raw input from a form or API.
	 * @return array Sanitized values.
	 */
	public static function sanitize_settings( array $input ): array {
		$clean = [];
		foreach ( $input as $key => $value ) {
			if ( is_string( $value ) ) {
				$clean[ $key ] = sanitize_text_field( $value );
			} elseif ( is_bool( $value ) ) {
				$clean[ $key ] = (bool) $value;
			} elseif ( is_numeric( $value ) ) {
				$clean[ $key ] = absint( $value );
			}
		}
		return $clean;
	}

	/**
	 * Check if a plugin is active (by file path).
	 *
	 * Works even before `is_plugin_active()` is available.
	 *
	 * @param string $plugin_file e.g. 'woocommerce/woocommerce.php'
	 */
	public static function is_plugin_active( string $plugin_file ): bool {
		if ( function_exists( 'is_plugin_active' ) ) {
			return \is_plugin_active( $plugin_file );
		}
		$active = (array) get_option( 'active_plugins', [] );
		return in_array( $plugin_file, $active, true );
	}

	/**
	 * Log a message when WP_DEBUG_LOG is active.
	 *
	 * @param string $message Log message.
	 * @param string $level   'info' | 'warning' | 'error'
	 */
	public static function log( string $message, string $level = 'info' ): void {
		if ( defined( 'WP_DEBUG_LOG' ) && WP_DEBUG_LOG ) {
			error_log( sprintf( '[YST Manager][%s] %s', strtoupper( $level ), $message ) );
		}
	}
}
