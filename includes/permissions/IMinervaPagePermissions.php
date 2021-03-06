<?php
/**
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @file
 */
namespace MediaWiki\Minerva\Permissions;

/**
 * A wrapper for all available Minerva permissions.
 */
interface IMinervaPagePermissions {

	const WATCH = 'watch';
	const SWITCH_LANGUAGE = 'switch-language';
	/** Given user permission, the page content is editable. */
	const CONTENT_EDIT = 'edit';
	/** The existing page is editable or nonexisting page is creatable by the active user. */
	const EDIT_OR_CREATE = 'edit-or-create';
	const TALK = 'talk';
	const HISTORY = 'history';

	/**
	 * Gets whether or not the action is allowed.
	 *
	 * @param string $action
	 * @return bool
	 */
	public function isAllowed( $action );

	/**
	 * Returns true, if the page can have a talk page and user is logged in.
	 *
	 * @return bool
	 */
	public function isTalkAllowed();

}
