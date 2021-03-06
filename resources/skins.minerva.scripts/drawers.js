var $drawerContainer = $( document.body ),
	BODY_CLASS_SCROLL_LOCKED = 'has-drawer--with-scroll-locked',
	BODY_CLASSES_DRAWER_OPEN = 'navigation-enabled';

/**
 * Discard a drawer from display on the page.
 * @ignore
 * @param {Drawer} drawer
 */
function discardDrawer( drawer ) {
	// remove the class
	$drawerContainer.removeClass( [ BODY_CLASSES_DRAWER_OPEN, BODY_CLASS_SCROLL_LOCKED ] );
	// FIXME: queue removal from DOM (using setTimeout so that any animations have time to run)
	// This works around an issue in MobileFrontend that the Drawer onBeforeHide method is
	// called /before/ the animation for closing has completed. This needs to be accounted
	// for in Drawer so this function can be synchronous.
	setTimeout( function () {
		// remove the node from the DOM.
		drawer.$el.remove();
	}, 1000 );
}

/**
 * Reveal a drawer.
 */
function onShow() {
	$drawerContainer.addClass( BODY_CLASSES_DRAWER_OPEN );
}

/**
 * Lock scroll of viewport.
 */
function lockScroll() {
	$drawerContainer.addClass( BODY_CLASS_SCROLL_LOCKED );
}

/**
 * @param {Drawer} drawer to display
 * @param {Object} options for display
 * @param {boolean} options.hideOnScroll whether a scroll closes the drawer
 */
function displayDrawer( drawer, options ) {
	$drawerContainer.append( drawer.$el );
	drawer.show();
	// A click outside the drawer should close it.
	$( window ).one( 'click', function () {
		drawer.hide();
	} );
	if ( options.hideOnScroll ) {
		$( window ).one( 'scroll.drawer', function () {
			drawer.hide();
		} );
	}
}
module.exports = {
	displayDrawer: displayDrawer,
	onShow: onShow,
	lockScroll: lockScroll,
	discardDrawer: discardDrawer
};
