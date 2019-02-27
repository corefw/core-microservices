/**
 * @file Defines the ConfigManager class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 6.0.2
 * @license See LICENSE.md for details about licensing.
 * @copyright 2019 C2C Schools, LLC
 */

"use strict";

const BaseClass	= require( "@corefw/common" ).common.BaseClass;

/**
 * This class is responsible for loading the service configuration, which may be defined in multiple
 * places (locally and remotely).
 *
 * @abstract
 * @memberOf Config
 * @extends Common.BaseClass
 */
class ConfigManager extends BaseClass {

	// <editor-fold desc="--- Construction and Initialization --------------------------------------------------------">



	/**
	 * @inheritDoc
	 */
	_initialize( cfg ) {

		// Call parent
		super._initialize( cfg );

		// Init the remote config cache
		this._remoteConfig = null;

	}



	// </editor-fold>

	// <editor-fold desc="--- Logging --------------------------------------------------------------------------------">



	/**
	 * @inheritDoc
	 */
	get logger() {

		const me = this;

		if ( me._logger === undefined ) {

			let parentLogger	= super.logger;

			me._logger = parentLogger.fork( {
				component  : "ConfigManager",
				namePrefix : "config",
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

	// <editor-fold desc="--- Configuration Properties & Methods -----------------------------------------------------">



	/**
	 * The absolute path to the main service configuration file.
	 *
	 * @access public
	 * @type {string}
	 */
	get configPath() {
		return this.pathManager.join( "serviceRoot", "config/corefw.config.yml" );
	}

	/**
	 * The LOCAL configuration settings (excluding anything defined remotely).
	 *
	 * @access public
	 * @type {Object}
	 */
	get localConfig() {
		return this.loadYamlFile( this.configPath );
	}

	/**
	 * Settings for remote config loading, which are extracted from the 'localConfig' variable.
	 *
	 * @access public
	 * @type {Object}
	 */
	get remoteConfigSource() {
		return this.localConfig.RemoteConfigSource;
	}

	/**
	 * All configuration data that was loaded from a remote source.  This
	 * variable will be NULL until the remote data has finished loading.
	 *
	 * @access public
	 * @default null
	 * @type {Object}
	 */
	get remoteConfig() {
		return this._remoteConfig;
	}

	/**
	 * This is the main entry point for remote configuration loading.  This method will fetch
	 * the remote service configuration, parse it, and return it (by way of a promise).
	 *
	 * @public
	 * @throws Error if the configuration cannot be loaded or is invalid.
	 * @returns {Promise<Object>} A promise resolved with the full service configuration data.
	 */
	loadConfig() {

		let me = this;

		// Clear the remote config cache
		me._remoteConfig = null;

		// Tell someone...
		me.$log( "info", "load-config.start", "Resolving configuration values ..." );

		// Initialize the S3 client
		let s3 = me.$spawn( "commonLib", "aws/S3Client", {
			bucket: me.remoteConfigSource.bucket,
		} );

		// Tell someone...
		me.$log( "info", "remote-config.fetch.start", "Downloading remote configuration from AWS S3 ..." );

		// Defer to the S3Client object to download and parse the remote YAML file.
		return s3.getYamlObject( me.remoteConfigSource.key ).then(

			function afterConfigDownloaded( remoteConfig ) {

				// Tell someone...
				me.$log( "info", "remote-config.fetch.complete", "Remote config was received from S3 and was parsed successfully." );

				// Persist the remote config
				me._remoteConfig = remoteConfig;

				// ... and resolve the promise with it ...
				return remoteConfig;

			}

		);


	}



	// </editor-fold>

}

module.exports = ConfigManager;
