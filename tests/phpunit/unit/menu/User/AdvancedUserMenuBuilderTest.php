<?php

namespace MediaWiki\Minerva;

use MediaWiki\Minerva\Menu\Definitions;
use MediaWiki\Minerva\Menu\User\AdvancedUserMenuBuilder;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\SpecialPage\SpecialPageFactory;
use MediaWiki\User\User;
use MessageLocalizer;

/**
 * @group MinervaNeue
 * @coversDefaultClass \MediaWiki\Minerva\Menu\User\AdvancedUserMenuBuilder
 */
class AdvancedUserMenuBuilderTest extends \MediaWikiUnitTestCase {

	/**
	 * @covers ::getGroup
	 */
	public function testTempUserExcludesUserpage() {
		$user = $this->createMock( User::class );
		$user->method( 'isTemp' )->willReturn( true );
		$user->method( 'getEditCount' )->willReturn( 1 );
		$msgLocalizer = $this->createMock( MessageLocalizer::class );
		$definitions = new Definitions(
			$this->createMock( SpecialPageFactory::class ),
			$this->createMock( ExtensionRegistry::class )
		);

		$builder = new AdvancedUserMenuBuilder( $msgLocalizer, $user, $definitions );
		$group = $builder->getGroup( [
			'userpage' => [
				'text' => '~2026-1',
				'href' => '/wiki/User:~2026-1',
				'icon' => 'userAvatar',
			],
			'watchlist' => [
				'text' => 'Watchlist',
				'href' => '/wiki/Special:EditWatchlist',
				'icon' => 'unStar',
			],
		] );

		$entries = $group->getEntries();
		$entryNames = array_map( static fn ( $e ) => $e['name'], $entries );

		$this->assertNotContains( 'userpage', $entryNames,
			'userpage should be excluded for temp users' );
		$this->assertContains( 'watchlist', $entryNames,
			'watchlist should still be present for temp users' );
	}
}
