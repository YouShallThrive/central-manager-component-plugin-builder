<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/*wpforms scroll offset*/
add_action( 'wpforms_wp_footer_end', function () {
	?>
<script type="text/javascript">
jQuery( function() {
	window.wpforms.animateScrollTop = function( position, duration, complete ) {
		var adminBar = jQuery( '#wpadminbar:visible' );
		var header = jQuery( '.fusion-tb-header .fusion-sticky-container:visible' );
		var adminBarHeight = adminBar.length ? adminBar.outerHeight() : 0;
		var headerHeight = ( header.length && header.hasClass( 'fusion-container-stuck' ) ) ? header.outerHeight() : 0;
		duration = duration || 1000;
		complete = typeof complete === 'function' ? complete : function() {};
		return jQuery( 'html, body' ).animate( { scrollTop: parseInt( position - ( headerHeight + adminBarHeight ), 10 ) }, { duration: duration, complete: complete } ).promise();
	};
} );
</script>
	<?php
}, 10 );
