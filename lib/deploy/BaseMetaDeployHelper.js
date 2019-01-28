/**
 * @file Defines the BaseMetaDeployHelper class.
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

const BaseClass	= require( "@corefw/common" ).common.BaseClass;

/**
 * Something...
 *
 * @abstract
 * @memberOf Deploy
 * @extends Common.BaseClass
 */
class BaseMetaDeployHelper extends BaseClass {

	// <editor-fold desc="--- Construction and Initialization ----------------">

	/**
	 * @inheritDoc
	 */
	_initialize( cfg ) {

		// Call parent
		super._initialize( cfg );
	}

	// </editor-fold>

	// <editor-fold desc="--- Properties -------------------------------------">

	/**
	 * Returns the MetaDeploymentManager object that spawned this helper class object.
	 *
	 * @access public
	 * @default null
	 * @type {Deploy.MetaDeploymentManager}
	 */
	get mdm() {

		return this.getConfigValue( "metaDeploymentManager", null );
	}

	set mdm( val ) {

		this.setConfigValue( "metaDeploymentManager", val );
	}

	get packageData() {

		return this.mdm.packageData;
	}

	get serviceRootPath() {

		return this.mdm.serviceRootPath;
	}

	/**
	 * The name of this deploy helper; this is useful for differentiating between the various deployment helpers in the
	 * log output when the same module or target type is used more than once.
	 *
	 * @access public
	 * @default this.constructor.name
	 * @type {string}
	 */
	get name() {

		return this.getConfigValue( "name", this.constructor.name );
	}

	set name( val ) {

		this.setConfigValue( "name", val );
	}

	// </editor-fold>

	// <editor-fold desc="--- Logging ----------------------------------------">

	/**
	 * @inheritDoc
	 */
	get logger() {

		const me = this;

		if ( me._logger === undefined ) {

			let parentLogger	= super.logger;
			let prefix			= me._logComponentPrefix;
			let idSuffix		= prefix.replace( /[\:\s]+/g, "" ).toLowerCase() + "." + me.constructor.name;

			me._logger = parentLogger.fork( {
				component  : prefix + me.name,
				namePrefix : idSuffix,
			} );
		}

		return me._logger;
	}

	/**
	 * @inheritDoc
	 */
	set logger( val ) {

		super.logger = val;
	}

	// </editor-fold>

	// <editor-fold desc="--- Utility Methods --------------------------------">

	resolveLocalAbs( relLocalPath ) {

		// Locals
		let me = this;
		let servicePath = me.serviceRootPath;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( servicePath, relLocalPath	);
	}

	resolveServiceRel( absLocalPath ) {

		// Locals
		let me = this;
		let servicePath = me.serviceRootPath;

		// Remove service root and return
		return absLocalPath.replace( servicePath, "" );
	}

	_convertObjectToJson( obj ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		/**
		 * Filter out pseudo-comments (keys prefixed with '//')
		 *
		 * @param {string} key - Property key.
		 * @param {*} value - Property value
		 * @returns {*} New property value.
		 */
		function replacerFn( key, value ) {

			if ( _.startsWith( key, "//" ) ) {

				return undefined;
			}

			return value;
		}

		// Convert to JSON and return
		return JSON.stringify( obj, replacerFn, "\t" );
	}

	_convertObjectToYaml( obj ) {

		// Locals
		let me = this;

		// Dependencies
		const YAML = me.$dep( "yaml" );

		// Convert to JSON first, for consistency (replacerFn)
		let json = me._convertObjectToJson( obj );

		// Convert back to an Object
		let parsed = JSON.parse( json );

		// Convert to YAML and return
		return YAML.safeDump( parsed );
	}

	/**
	 * Convenience alias/proxy for `BaseGenerator#_findFilesWithPattern()`
	 *
	 * @access public
	 * @param {string} basePath - The file system path to search
	 * @param {RegExp} pattern - The regular expression to test each absolute
	 *     path against.
	 * @returns {Object} A plain-object, keyed by absolute paths, that
	 *     contains information about each file that was matched/found.
	 */
	findFilesWithPattern( basePath, pattern ) {

		return this.mdm._findFilesWithPattern( basePath, pattern );
	}

	/**
	 * Convenience alias/proxy for `BaseGenerator#_getFilesRecursive()`
	 *
	 * @access public
	 * @param {string} basePath - The file system path to scan/walk.
	 * @returns {Object} A plain-object, keyed by absolute paths, that
	 *     contains information about each file within the provided `basePath`.
	 */
	getFilesRecursive( basePath ) {

		return this.mdm._getFilesRecursive( basePath );
	}

	// </editor-fold>
}

module.exports = BaseMetaDeployHelper;
