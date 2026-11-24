<?php
/**
 * Self-hosted plugin updates.
 *
 * Polls the YST plugin repository (plugin-builder space) for new
 * versions and surfaces them in wp-admin like a wordpress.org
 * update — including the "View details" modal.
 *
 * Update host: https://plugin-builder.ystvps.com/wp-updates
 * Override with the YST_MANAGER_UPDATE_URL constant or the
 * `yst_manager_update_url` filter (e.g. to point a staging site at
 * the preview repository).
 *
 * @package YST_Manager
 */

namespace YST_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Updater {

	private const DEFAULT_UPDATE_URL = 'https://plugin-builder.ystvps.com/wp-updates';
	private const CACHE_KEY          = 'yst_manager_update_manifest';
	private const CACHE_TTL          = 6 * HOUR_IN_SECONDS;

	private string $slug = 'yst-manager';

	/**
	 * Register update hooks. Cheap — only adds filters; remote
	 * requests happen when WP refreshes the update transient.
	 */
	public function register(): void {
		add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'inject_update' ] );
		add_filter( 'plugins_api', [ $this, 'plugin_details' ], 10, 3 );
		add_filter( 'upgrader_pre_install', [ $this, 'preserve_custom' ], 10, 2 );
		add_filter( 'upgrader_post_install', [ $this, 'restore_custom' ], 10, 3 );
		add_action( 'upgrader_process_complete', [ $this, 'flush_cache' ], 10, 2 );
		add_filter( 'plugin_row_meta', [ $this, 'row_meta' ], 10, 2 );
		add_action( 'admin_init', [ $this, 'handle_check_request' ] );
		add_action( 'admin_notices', [ $this, 'checked_notice' ] );
	}

	/*check for updates*/

	public function row_meta( $links, $file ) {
		if ( YST_MANAGER_BASENAME !== $file || ! current_user_can( 'update_plugins' ) ) {
			return $links;
		}
		$url = wp_nonce_url(
			add_query_arg( 'yst_manager_check_updates', '1', admin_url( 'plugins.php' ) ),
			'yst_manager_check_updates'
		);
		$links[] = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Check for updates', 'yst-manager' ) . '</a>';
		return $links;
	}

	public function handle_check_request(): void {
		if ( empty( $_GET['yst_manager_check_updates'] ) || ! current_user_can( 'update_plugins' ) ) {
			return;
		}
		check_admin_referer( 'yst_manager_check_updates' );
		delete_site_transient( self::CACHE_KEY );
		delete_site_transient( 'update_plugins' );
		wp_update_plugins();
		wp_safe_redirect( add_query_arg( 'yst_manager_checked', '1', admin_url( 'plugins.php' ) ) );
		exit;
	}

	public function checked_notice(): void {
		if ( empty( $_GET['yst_manager_checked'] ) || ! current_user_can( 'update_plugins' ) ) {
			return;
		}
		$manifest = $this->manifest();
		if ( ! $manifest ) {
			$class   = 'notice-warning';
			$message = 'YST Manager could not reach the YST plugin repository.';
		} elseif ( version_compare( YST_MANAGER_VERSION, $manifest->version, '<' ) ) {
			$class   = 'notice-info';
			$message = 'YST Manager ' . $manifest->version . ' is available. You are running ' . YST_MANAGER_VERSION . '.';
		} else {
			$class   = 'notice-success';
			$message = 'YST Manager is up to date (' . YST_MANAGER_VERSION . ').';
		}
		printf( '<div class="notice %s is-dismissible"><p>%s</p></div>', esc_attr( $class ), esc_html( $message ) );
	}

	/*manifest*/

	/** Base URL of the update endpoint (no trailing slash). */
	private function update_url(): string {
		$url = defined( 'YST_MANAGER_UPDATE_URL' )
			? YST_MANAGER_UPDATE_URL
			: self::DEFAULT_UPDATE_URL;
		return untrailingslashit( apply_filters( 'yst_manager_update_url', $url ) );
	}

	/** Fetch (and cache) the update manifest. */
	private function manifest(): ?object {
		$cached = get_site_transient( self::CACHE_KEY );
		if ( is_object( $cached ) ) {
			return $cached;
		}

		$response = wp_remote_get(
			$this->update_url() . '/' . $this->slug . '.json?t=' . time(), // bust edge cache
			[ 'timeout' => 10, 'headers' => [ 'Accept' => 'application/json' ] ]
		);
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}

		$manifest = json_decode( wp_remote_retrieve_body( $response ) );
		if ( ! is_object( $manifest ) || empty( $manifest->version ) ) {
			return null;
		}

		set_site_transient( self::CACHE_KEY, $manifest, self::CACHE_TTL );
		return $manifest;
	}

	/** Package zip URL — built from the configured host so proxies/rewrites keep working. */
	private function package_url(): string {
		// Prefer the manifest's download_url (carries a ?v= cache-buster so
		// edge/CDN caches can never serve a stale package). Fallback keeps
		// its own version-based buster.
		$manifest = $this->manifest();
		if ( $manifest && ! empty( $manifest->download_url ) ) {
			return $manifest->download_url;
		}
		$version = $manifest->version ?? YST_MANAGER_VERSION;
		return $this->update_url() . '/' . $this->slug . '.zip?v=' . rawurlencode( $version );
	}

	/**
	 * Inject an available update into the update_plugins transient.
	 *
	 * @param object|mixed $transient Update transient.
	 * @return object|mixed
	 */
	public function inject_update( $transient ) {
		if ( ! is_object( $transient ) ) {
			return $transient;
		}

		$manifest = $this->manifest();
		if ( ! $manifest ) {
			return $transient;
		}

		$plugin_file = YST_MANAGER_BASENAME;

		if ( version_compare( YST_MANAGER_VERSION, $manifest->version, '<' ) ) {
			$update = (object) [
				'id'          => $this->slug,
				'slug'        => $this->slug,
				'plugin'      => $plugin_file,
				'new_version' => $manifest->version,
				'url'         => $this->update_url(),
				'package'     => $this->package_url(),
				'requires'    => $manifest->requires ?? '6.4',
				'tested'      => $manifest->tested ?? '',
				'requires_php' => $manifest->requires_php ?? '8.1',
			];
			$transient->response[ $plugin_file ] = $update;
			unset( $transient->no_update[ $plugin_file ] );
		} else {
			// Report as up-to-date so WP doesn't nag.
			$transient->no_update[ $plugin_file ] = (object) [
				'id'          => $this->slug,
				'slug'        => $this->slug,
				'plugin'      => $plugin_file,
				'new_version' => YST_MANAGER_VERSION,
				'url'         => $this->update_url(),
				'package'     => $this->package_url(),
			];
		}

		return $transient;
	}

	/**
	 * Provide data for the "View details" modal.
	 *
	 * @param false|object|array $result Default result.
	 * @param string             $action plugins_api action.
	 * @param object             $args   Request args.
	 * @return false|object
	 */
	public function plugin_details( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || ( $args->slug ?? '' ) !== $this->slug ) {
			return $result;
		}

		$manifest = $this->manifest();
		if ( ! $manifest ) {
			return $result;
		}

		return (object) [
			'name'          => $manifest->name ?? 'YST Manager',
			'slug'          => $this->slug,
			'version'       => $manifest->version,
			'author'        => $manifest->author ?? 'YST Agency',
			'requires'      => $manifest->requires ?? '6.4',
			'tested'        => $manifest->tested ?? '',
			'requires_php'  => $manifest->requires_php ?? '8.1',
			'last_updated'  => $manifest->last_updated ?? '',
			'download_link' => $this->package_url(),
			'sections'      => [
				'description' => $manifest->sections->description ?? '',
				'changelog'   => nl2br( esc_html( $manifest->sections->changelog ?? '' ) ),
			],
		];
	}

	/**
	 * Clear the cached manifest after this plugin gets updated.
	 *
	 * @param \WP_Upgrader $upgrader Upgrader instance.
	 * @param array        $extra    Update info.
	 */
	/**
	 * Before WP replaces the plugin folder, copy custom/ (the
	 * site-specific code) to uploads. WP's upgrader deletes the whole
	 * plugin directory, so without this every update would wipe the
	 * site's customizations.
	 *
	 * The copy in uploads is kept permanently as a safety net in case
	 * an update dies between pre_install and post_install.
	 */
	public function preserve_custom( $response, $hook_extra ) {
		if ( is_wp_error( $response ) || ! $this->is_our_plugin( $hook_extra ) ) {
			return $response;
		}
		foreach ( self::PRESERVED_DIRS as $dir ) {
			$src = WP_PLUGIN_DIR . '/' . dirname( YST_MANAGER_BASENAME ) . '/' . $dir;
			if ( is_dir( $src ) ) {
				$this->copy_dir( $src, trailingslashit( $this->backup_dir() ) . $dir );
				$this->log( 'preserve: backed up ' . $dir . '/ (' . count( glob( $src . '/*' ) ) . ' items)' );
			}
		}
		return $response;
	}

	/**
	 * After the new version is unpacked, restore custom/ into it.
	 */
	public function restore_custom( $response, $hook_extra, $result ) {
		if ( is_wp_error( $response ) || ! $this->is_our_plugin( $hook_extra ) ) {
			return $response;
		}
		$root = isset( $result['destination'] ) ? trailingslashit( $result['destination'] ) : '';
		foreach ( self::PRESERVED_DIRS as $dir ) {
			$backup = trailingslashit( $this->backup_dir() ) . $dir;
			if ( $root && is_dir( $backup ) ) {
				$this->copy_dir( $backup, $root . $dir );
				$this->log( 'restore: restored ' . $dir . '/ into ' . $root . $dir );
			} else {
				$this->log( 'restore: skipped ' . $dir . '/ (dest root=' . $root . ', backup exists=' . var_export( is_dir( $backup ), true ) . ')' );
			}
		}
		return $response;
	}

	/**
	 * Site-owned directories preserved across updates. The repo only
	 * ever ships empty scaffolds inside these; the site's copies always
	 * win on restore (merge/copy-over, nothing deleted).
	 */
	private const PRESERVED_DIRS = [ 'custom', 'public', 'admin' ];

	/** Whether the upgrader is acting on this plugin. */
	private function is_our_plugin( $hook_extra ): bool {
		return is_array( $hook_extra )
			&& isset( $hook_extra['plugin'] )
			&& YST_MANAGER_BASENAME === $hook_extra['plugin'];
	}

	/** Where custom/ is backed up during updates (kept as safety net). */
	private function backup_dir(): string {
		$uploads = wp_get_upload_dir();
		return trailingslashit( $uploads['basedir'] ) . 'yst-manager-custom-backup';
	}

	/** Append a line to the update log in uploads (best-effort). */
	private function log( string $msg ): void {
		$uploads = wp_get_upload_dir();
		@file_put_contents(
			trailingslashit( $uploads['basedir'] ) . 'yst-manager-update.log',
			gmdate( 'c' ) . ' [' . YST_MANAGER_VERSION . '] ' . $msg . "\n",
			FILE_APPEND
		);
	}

	/** Recursive copy that creates directories as needed. */
	private function copy_dir( string $from, string $to ): void {
		if ( ! is_dir( $from ) ) {
			return;
		}
		if ( ! is_dir( $to ) ) {
			wp_mkdir_p( $to );
		}
		foreach ( scandir( $from ) as $item ) {
			if ( '.' === $item || '..' === $item ) {
				continue;
			}
			$src = $from . '/' . $item;
			$dst = $to . '/' . $item;
			if ( is_dir( $src ) ) {
				$this->copy_dir( $src, $dst );
			} else {
				copy( $src, $dst );
			}
		}
	}

	public function flush_cache( $upgrader, $extra ): void {
		if ( ( $extra['type'] ?? '' ) === 'plugin' ) {
			delete_site_transient( self::CACHE_KEY );
		}
		// Belt and braces: if this plugin was just updated and custom/ is
		// missing (e.g. post_install restore failed), restore from backup.
		$plugins = (array) ( $extra['plugins'] ?? [] );
		if ( isset( $extra['plugin'] ) ) {
			$plugins[] = $extra['plugin'];
		}
		if ( ( $extra['type'] ?? '' ) === 'plugin' && in_array( YST_MANAGER_BASENAME, $plugins, true ) ) {
			foreach ( self::PRESERVED_DIRS as $dir ) {
				$dest   = WP_PLUGIN_DIR . '/' . dirname( YST_MANAGER_BASENAME ) . '/' . $dir;
				$backup = trailingslashit( $this->backup_dir() ) . $dir;
				if ( ! is_dir( $dest ) && is_dir( $backup ) ) {
					$this->copy_dir( $backup, $dest );
					$this->log( 'process_complete: ' . $dir . '/ was missing — restored from backup' );
				}
			}
		}
	}
}
