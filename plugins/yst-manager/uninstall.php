<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * Clean up any options, transients, custom tables, or files
 * that were created by the plugin.
 *
 * @package YST_Manager
 */

// Abort if not called by WordPress.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/*
 * === CLEAN UP HERE ===
 *
 * Examples:
 *   delete_option( 'yst_manager_settings' );
 *   delete_transient( 'yst_manager_cache' );
 *   $wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}yst_manager" );
 */
