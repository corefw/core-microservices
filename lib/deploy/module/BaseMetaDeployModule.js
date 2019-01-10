/**
 * @file Defines the BaseMetaDeployModule class.
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
 * @memberOf Deploy.Module
 * @extends Deploy.BaseMetaDeployHelper
 */
class BaseMetaDeployModule extends ParentClass {



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
		me.$log("info", "init", "Initializing Module: " + me.constructor.name );

	}

	// </editor-fold>

	// <editor-fold desc="--- Logging ----------------------------------------">




	get _logComponentPrefix() {
		return "Module:";
	}




	// </editor-fold>

	// <editor-fold desc="--- Properties -------------------------------------">



	/**
	 * An array of deployment targets that this module should use to deploy entities.
	 *
	 * @access public
	 * @default []
	 * @type {Deploy.Target.BaseMetaDeployTarget[]}
	 */
	get targets() {
		return this.getConfigValue( "targets", [] );
	}

	set targets( val ) {
		this.setConfigValue( "targets", val );
	}



	// </editor-fold>

	execute() {

		// Locals
		let me = this;

		// Deps
		const _ = me.$dep("lodash");
		const bb = me.$dep("bluebird");

		// Tell someone..
		me.$log("info", "execute.start", "Executing Meta Deployment Module (" + me.constructor.name + ")" );

		// Deploy to each target..
		return bb.mapSeries( me.targets,

			function( target, index ) {

				let id = index + 1;

				me.$log("info", "execute.target", "Deploying to Target #" + id + " (" + me.constructor.name + " -> " + target.constructor.name + ")" );

				return me.deployToTarget( target );

			}

		).then(

			function( res ) {

				me.$log("info", "execute.end", "All operations for module '" + me.constructor.name + "' have completed successfully." );
				return res;

			}

		);

	}

	// Stub
	deployToTarget( target ) {}

}

module.exports = BaseMetaDeployModule;
