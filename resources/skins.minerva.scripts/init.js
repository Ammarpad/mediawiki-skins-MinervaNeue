( function ( M ) {
	var
		mobile = M.require( 'mobile.startup' ),
		PageGateway = mobile.PageGateway,
		permissions = mw.config.get( 'wgMinervaPermissions' ) || {},
		toast = mobile.toast,
		Icon = mobile.Icon,
		time = mobile.time,
		errorLogging = require( './errorLogging.js' ),
		preInit = require( './preInit.js' ),
		mobileRedirect = require( './mobileRedirect.js' ),
		search = require( './search.js' ),
		references = require( './references.js' ),
		TitleUtil = require( './TitleUtil.js' ),
		issues = require( './page-issues/index.js' ),
		Toolbar = require( './Toolbar.js' ),
		ToggleList = require( '../../components/ToggleList/ToggleList.js' ),
		TabScroll = require( './TabScroll.js' ),
		router = require( 'mediawiki.router' ),
		ctaDrawers = require( './ctaDrawers.js' ),
		desktopMMV = mw.loader.getState( 'mmv.bootstrap' ),
		overlayManager = mobile.OverlayManager.getSingleton(),
		currentPage = mobile.currentPage(),
		currentPageHTMLParser = mobile.currentPageHTMLParser(),
		$redLinks = currentPageHTMLParser.getRedLinks(),
		api = new mw.Api(),
		eventBus = mobile.eventBusSingleton,
		namespaceIDs = mw.config.get( 'wgNamespaceIds' );

	/**
	 * Event handler for clicking on an image thumbnail
	 * @param {JQuery.Event} ev
	 * @ignore
	 */
	function onClickImage( ev ) {
		// Do not interfere with non-left clicks or if modifier keys are pressed.
		if ( ( ev.button !== 0 && ev.which !== 1 ) ||
			ev.altKey || ev.ctrlKey || ev.shiftKey || ev.metaKey ) {
			return;
		}

		ev.preventDefault();
		routeThumbnail( $( this ).data( 'thumb' ) );
	}

	/**
	 * @param {JQuery.Element} thumbnail
	 * @ignore
	 */
	function routeThumbnail( thumbnail ) {
		router.navigate( '#/media/' + encodeURIComponent( thumbnail.getFileName() ) );
	}

	/**
	 * Add routes to images and handle clicks
	 * @method
	 * @ignore
	 * @param {JQuery.Object} [$container] Optional container to search within
	 */
	function initMediaViewer( $container ) {
		currentPageHTMLParser.getThumbnails( $container ).forEach( function ( thumb ) {
			thumb.$el.off().data( 'thumb', thumb ).on( 'click', onClickImage );
		} );
	}

	/**
	 * Hijack the Special:Languages link and replace it with a trigger to a languageOverlay
	 * that displays the same data
	 * @ignore
	 */
	function initButton() {
		// This catches language selectors in page actions and in secondary actions (e.g. Main Page)
		// eslint-disable-next-line no-jquery/no-global-selector
		var $primaryBtn = $( '.language-selector' );

		if ( $primaryBtn.length ) {
			// We only bind the click event to the first language switcher in page
			$primaryBtn.on( 'click', function ( ev ) {
				ev.preventDefault();

				if ( $primaryBtn.attr( 'href' ) || $primaryBtn.find( 'a' ).length ) {
					router.navigate( '/languages' );
				} else {
					toast.show( mw.msg( 'mobile-frontend-languages-not-available' ) );
				}
			} );
		}
	}

	/**
	 * Returns a rejected promise if MultimediaViewer is available. Otherwise
	 * returns the mediaViewerOverlay
	 * @method
	 * @ignore
	 * @param {string} title the title of the image
	 * @return {JQuery.Deferred|Overlay}
	 */
	function makeMediaViewerOverlayIfNeeded( title ) {
		if ( mw.loader.getState( 'mmv.bootstrap' ) === 'ready' ) {
			// This means MultimediaViewer has been installed and is loaded.
			// Avoid loading it (T169622)
			return $.Deferred().reject();
		}

		return mobile.mediaViewer.overlay( {
			api: api,
			thumbnails: currentPageHTMLParser.getThumbnails(),
			title: decodeURIComponent( title ),
			eventBus: eventBus
		} );
	}

	// Routes
	overlayManager.add( /^\/media\/(.+)$/, makeMediaViewerOverlayIfNeeded );
	overlayManager.add( /^\/languages$/, function () {
		return mobile.languageOverlay( new PageGateway( api ) );
	} );

	// Setup
	$( function () {
		initButton();
	} );

	// If the MMV module is missing or disabled from the page, initialise our version
	if ( desktopMMV === null || desktopMMV === 'registered' ) {
		mw.hook( 'wikipage.content' ).add( initMediaViewer );
	}

	/**
	 * Initialisation function for last modified module.
	 *
	 * Enhances an element representing a time
	 * to show a human friendly date in seconds, minutes, hours, days
	 * months or years
	 * @ignore
	 * @param {JQuery.Object} $lastModifiedLink
	 */
	function initHistoryLink( $lastModifiedLink ) {
		var delta, historyUrl, $msg, $bar,
			ts, username, gender;

		historyUrl = $lastModifiedLink.attr( 'href' );
		ts = $lastModifiedLink.data( 'timestamp' );
		username = $lastModifiedLink.data( 'user-name' ) || false;
		gender = $lastModifiedLink.data( 'user-gender' );

		if ( ts ) {
			delta = time.getTimeAgoDelta( parseInt( ts, 10 ) );
			if ( time.isRecent( delta ) ) {
				$bar = $lastModifiedLink.closest( '.last-modified-bar' );
				$bar.addClass( 'active' );
				$bar.find( '.mw-ui-icon-minerva-clock' ).addClass( 'mw-ui-icon-minerva-clock-invert' );
				$bar.find( '.mw-ui-icon-mf-expand-gray' ).addClass( 'mw-ui-icon-mf-expand-invert' );
			}
			$msg = $( '<span>' ).addClass( 'last-modified-bar__text' ).html(
				time.getLastModifiedMessage( ts, username, gender, historyUrl )
			);
			$lastModifiedLink.replaceWith( $msg );
		}
	}

	/**
	 * @method
	 * @param {JQuery.Event} ev
	 */
	function amcHistoryClickHandler( ev ) {
		var
			self = this,
			amcOutreach = mobile.amcOutreach,
			amcCampaign = amcOutreach.loadCampaign(),
			onDismiss = function () {
				toast.showOnPageReload( mw.message( 'mobile-frontend-amc-outreach-dismissed-message' ).text() );
				window.location = self.href;
			};

		if ( amcCampaign.showIfEligible( amcOutreach.ACTIONS.onHistoryLink, onDismiss, currentPage.title, 'action=history' ) ) {
			ev.preventDefault();
		}
	}

	/**
	 * @method
	 * @param {JQuery.Object} $lastModifiedLink
	 * @ignore
	 */
	function initAmcHistoryLink( $lastModifiedLink ) {
		$lastModifiedLink.one( 'click', amcHistoryClickHandler );
	}

	/**
	 * Initialisation function for last modified times
	 *
	 * Enhances .modified-enhancement element
	 * to show a human friendly date in seconds, minutes, hours, days
	 * months or years
	 * @ignore
	 */
	function initModifiedInfo() {
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.modified-enhancement' ).each( function () {
			initHistoryLink( $( this ) );
		} );
	}

	/**
	 * Initialisation function for user creation module.
	 *
	 * Enhances an element representing a time
	 + to show a human friendly date in seconds, minutes, hours, days
	 * months or years
	 * @ignore
	 * @param {JQuery.Object} [$tagline]
	 */
	function initRegistrationDate( $tagline ) {
		var msg, ts;

		ts = $tagline.data( 'userpage-registration-date' );

		if ( ts ) {
			msg = time.getRegistrationMessage( ts, $tagline.data( 'userpage-gender' ) );
			$tagline.text( msg );
		}
	}

	/**
	 * For logout links do the API logout first so system do not show interstitial step,
	 * and then redirect to LogoutPage (when user is already logged out) to show information
	 * about successful logout and information about caching.
	 *
	 * @param {string} selector Logout links selector
	 */
	function initSmartLogout( selector ) {
		// Turn logout to a POST action
		$( selector ).on( 'click', function ( e ) {
			toast.show(
				mw.message( 'logging-out-notify' ).text(), {
					tag: 'logout',
					autoHide: false
				}
			);
			api.postWithToken( 'csrf', {
				action: 'logout'
			} ).then(
				function () {
					location.reload();
				},
				function () {
					toast.showOnPageReload( mw.message( 'logout-failed' ).text() );
					location.reload();
				}
			);
			e.preventDefault();
		} );
	}

	/**
	 * Initialisation function for registration date on user page
	 *
	 * Enhances .tagline-userpage element
	 * to show human friendly date in seconds, minutes, hours, days
	 * months or years
	 * @ignore
	 */
	function initRegistrationInfo() {
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '#tagline-userpage' ).each( function () {
			initRegistrationDate( $( this ) );
		} );
	}

	/**
	 * Tests a URL to determine if it links to a local User namespace page or not.
	 *
	 * Assuming the current page visited is hosted on metawiki, the following examples would return
	 * true:
	 *
	 *   https://meta.wikimedia.org/wiki/User:Foo
	 *   /wiki/User:Foo
	 *   /wiki/User:Nonexistent_user_page
	 *
	 * The following examples return false:
	 *
	 *   https://en.wikipedia.org/wiki/User:Foo
	 *   /wiki/Foo
	 *   /wiki/User_talk:Foo
	 *
	 * @param {string} url
	 * @return {boolean}
	 */
	function isUserUri( url ) {
		var
			title = TitleUtil.newFromUri( url ),
			namespace = title ? title.getNamespaceId() : undefined;
		return namespace === namespaceIDs.user;
	}

	/**
	 * Strip the edit action from red links to nonexistent User namespace pages.
	 * @return {void}
	 */
	function initUserRedLinks() {
		$redLinks.filter( function ( _, element ) {
			// Filter out non-User namespace pages.
			return isUserUri( element.href );
		} ).each( function ( _, element ) {
			var uri = new mw.Uri( element.href );
			if ( uri.query.action !== 'edit' ) {
				// Nothing to strip.
				return;
			}

			// Strip the action.
			delete uri.query.action;

			// Update the element with the new link.
			element.href = uri.toString();
		} );
	}

	$( function () {
		var
			// eslint-disable-next-line no-jquery/no-global-selector
			$watch = $( '#page-actions-watch' ),
			toolbarElement = document.querySelector( Toolbar.selector ),
			userMenu = document.querySelector( '.minerva-user-menu' ); // See UserMenuDirector.

		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.mw-mf-page-center__mask' ).on( 'click', function ( ev ) {
			var path = router.getPath();
			// avoid jumping to the top of the page and polluting history by avoiding the
			// resetting of the hash unless the hash is being utilised (T237015).
			if ( !path ) {
				ev.preventDefault();
			}
		} );
		// Init:
		// - main menu closes when you click outside of it
		// - redirects show a toast.
		preInit();
		// - references
		references();
		// - search
		search();
		// - mobile redirect
		mobileRedirect( mobile.amcOutreach, currentPage );
		// Update anything else that needs enhancing (e.g. watchlist)
		initModifiedInfo();
		initRegistrationInfo();
		// eslint-disable-next-line no-jquery/no-global-selector
		initHistoryLink( $( 'a.last-modified-bar__text' ) );
		// eslint-disable-next-line no-jquery/no-global-selector
		initAmcHistoryLink( $( '.last-modified-bar__text a' ) );
		if ( toolbarElement ) {
			Toolbar.bind( window, toolbarElement );
			Toolbar.render( window, toolbarElement );
		}
		if ( userMenu ) {
			ToggleList.bind( window, userMenu );
		}
		TabScroll.initTabsScrollPosition();
		// Setup the issues banner on the page
		// Pages which dont exist (id 0) cannot have issues
		if ( !currentPage.isMissing ) {
			issues.init( overlayManager, currentPageHTMLParser );
		}

		mw.requestIdleCallback( errorLogging );
		// deprecation notices
		mw.log.deprecate( router, 'navigate', router.navigate, 'use navigateTo instead' );

		// setup toc icons
		new Icon( {
			glyphPrefix: 'minerva',
			name: 'toc'
		} ).$el.prependTo( '.toctitle' );
		new Icon( {
			glyphPrefix: 'mf',
			name: 'expand',
			// FIXME: `additionalClassNames` for backwards compatibility.
			// Can be removed when  Ibbc706146710a9e31a72b3c2cd4e247d7a227488 lands.
			additionalClassNames: 'mw-ui-icon-mf-arrow',
			isSmall: true
		} ).$el.appendTo( '.toctitle' );

		// wire up talk icon if necessary
		if ( permissions.talk ) {
			require( './talk.js' )( mobile );
		}

		// wire up watch icon if necessary
		if ( permissions.watch ) {
			if ( mw.user.isAnon() ) {
				ctaDrawers.initWatchstarCta( $watch );
			} else {
				require( './watchstar.js' )( $watch );
			}
		}
		ctaDrawers.initRedlinksCta(
			$redLinks.filter( function ( _, element ) {
				// Filter out local User namespace pages.
				return !isUserUri( element.href );
			} )
		);
		initSmartLogout( '.menu__item--logout' );
		initUserRedLinks();
	} );

// eslint-disable-next-line no-restricted-properties
}( mw.mobileFrontend ) );

module.exports = {
	// Version number allows breaking changes to be detected by other extensions
	VERSION: 1
};
