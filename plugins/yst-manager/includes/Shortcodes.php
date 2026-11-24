<?php
/**
 * Shortcodes.
 *
 * Registers all YST Manager shortcodes. Registered in the
 * shared-hooks section of Plugin::boot() so shortcodes work
 * on the front-end, in REST responses, and in editor previews.
 *
 * @package YST_Manager
 */

namespace YST_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Shortcodes {

	/**
	 * Register all shortcodes.
	 */
	public function register(): void {
		add_shortcode( 'current_year', [ $this, 'current_year_shortcode' ] );
	}

	/**
	 * [current_year] — outputs the current year (localized).
	 *
	 * Usage: [current_year]
	 *
	 * @param array|string $atts Shortcode attributes.
	 * @return string
	 */
	public function current_year_shortcode( $atts ) {

		// values
		$a = shortcode_atts( array(
			'key' => 'value',
		), $atts );

		// return
		return date_i18n( 'Y' );
	}
}
