/**
 * @file Defines the BaseMetaDeployTarget class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 5.1.30
 * @license See LICENSE.md for details about licensing.
 * @copyright 2019 C2C Schools, LLC
 */

"use strict";

// Important Note
// --------------
// This module only loads a single dependency, directly, which is the
// parent class for the class defined within. This is intended to force
// dependency loading through the parent class, by way of the `$dep()`
// method, in order to centralize dependency definition and loading.

const ParentClass	= require( "../BaseMetaDeployHelper" );

/**
 * Something...
 *
 * @abstract
 * @memberOf Deploy.Target
 * @extends Deploy.BaseMetaDeployHelper
 */
class BaseMetaDeployTarget extends ParentClass {

	// <editor-fold desc="--- Construction and Initialization ----------------">

	/**
	 * @inheritDoc
	 */
	_initialize( cfg ) {

		// Locals
		let me = this;

		// Call parent
		super._initialize( cfg );

		// Tell someone...
		me.$log("info", "init", "Initializing Deploy Target: " + me.constructor.name );

	}

	// </editor-fold>

	// <editor-fold desc="--- Logging ----------------------------------------">

	get _logComponentPrefix() {
		return "Target:";
	}

	// </editor-fold>

}

module.exports = BaseMetaDeployTarget;
