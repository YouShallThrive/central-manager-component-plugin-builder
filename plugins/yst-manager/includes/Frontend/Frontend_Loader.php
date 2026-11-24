<?php
/**
 * Front-end hook loader.
 *
 * All public-facing hooks go here. This class is only
 * instantiated when is_admin() is false, so nothing
 * in here adds weight to wp-admin.
 *
 * @package YST_Manager
 */

namespace YST_Manager\Frontend;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Frontend_Loader {

	/**
	 * Register all front-end hooks.
	 */
	public function register_hooks(): void {
		// NOTE: public/css/site.css + public/js/site.js are enqueued by
		// includes/Custom_Assets.php (always, on every front-end page).
		// Register future front-end hooks (shortcodes aside) here.
	}

}
