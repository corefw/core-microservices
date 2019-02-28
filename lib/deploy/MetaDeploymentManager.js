/**
 * Defines the MetaDeploymentManager class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 5.1.30
 * @license See LICENSE.md for details about licensing.
 * @copyright 2019 C2C Schools, LLC
 */

"use strict";

const BaseGenerator	= require( "../util/BaseGenerator" );

/**
 * This class is used to manage metadata deployment during CI/CD build processes.
 *
 * @memberOf Deploy
 * @extends Util.BaseGenerator
 */
class MetaDeploymentManager extends BaseGenerator {

	/**
	 * This is the main entry point for execution of this meta
	 * deployment manager.
	 *
	 * @access public
	 * @returns {Promise<void>} Void.
	 */
	execute() {

		// Locals
		let me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		// Tell someone...
		me.$log( "notice", "start", "The Metadata Deployment Manager is starting up ..." );

		// Before we execute the deployment, we need to use a
		// ConfigManager object to load the configuration settings.
		return me._initDeployConfig().then(

			function afterDeployConfigLoaded() {

				// After we load the deployment configuration, we need to "prepare"
				// all of the deployment targets by running any pre-deployment operations
				// on them (such as removing any previous deployments with the same version)
				return me.prepareTargets();

			}

		).then(

			function afterTargetsPrepared() {

				// Execute each "module" against each deployment target.
				return BB.mapSeries(

					me.modules,

					function ( module ) {

						// Tell someone we're starting...
						me.$log( "info", "module.execute", "Deferring to Module: " + module.constructor.name );

						// Execute the module ..
						return module.execute();

					}

				).then(

					function () {

						// Tell someone we've finished
						me.$log( "notice", "end", "Metadata deployment complete; exiting." );

					}

				);

			}

		);

	}

	// <editor-fold desc="--- Deployment Configuration Properties & Methods ------------------------------------------">

	/**
	 * Loads the metadata deployment configuration.  This method wraps the more generalized method, `_initConfig`,
	 * which loads the entire service configuration, by extracting the configuration settings that are relevant to
	 * metadata deployment.
	 *
	 * @private
	 * @throws Error if the configuration cannot be loaded or is invalid.
	 * @returns {Promise<Object>} A promise resolved with the deployment configuration data.
	 */
	_initDeployConfig() {

		// Locals
		let me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Load the config
		return me._initConfig().then(

			function afterConfigInit( fullConfig ) {

				if ( fullConfig.MetaDeploy === undefined ) {
					return me.$throw( "config.missing", "The provided configuration settings do not contain a 'MetaDeploy' property, which is required for metadata deployment." );
				} else if( TIPE( fullConfig.MetaDeploy ) !== "object" ) {
					return me.$throw( "config.invalid", "The provided 'MetaDeploy' configuration settings are invalid or malformed." );
				} else {

					// Capture the deploy config
					let config = fullConfig.MetaDeploy;

					// Parse the configuration for variables
					config = me._parseObjectForVariables( config, {} );

					// Validate it ...
					me._validateConfig( config );

					// ... and Persist it ...
					me._deployConfig = config;

					// All done
					return config;

				}

			}

		);
	}

	/**
	 * Validates the metadata deployment configuration.
	 *
	 * @private
	 * @throws Error if the provided metadata deployment configuration is invalid.
	 * @param {Object} config - The metadata deployment configuration to be validated.
	 * @returns {void}
	 */
	_validateConfig( config ) {

		// Locals
		let me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Require that the deploy config has at least one item
		// defined in the "DeployTargets" property (array).
		if (
			config.DeployTargets === undefined ||
			TIPE( config.DeployTargets ) !== "array" ||
			config.DeployTargets.length === 0
		) {

			me.$throw(
				"config.no.targets",
				"MetaDeploymentManager requires at least one deployment target! (DeployTargets)"
			);

		}

		// Require that the deploy config has at least one item
		// defined in the "Modules" property (array).
		if (
			config.Modules === undefined ||
			TIPE( config.Modules ) !== "array" ||
			config.Modules.length === 0
		) {

			me.$throw(
				"config.no.modules",
				"MetaDeploymentManager requires at least one module to be defined! (Modules)"
			);

		}

	}


	/**
	 * The deployment configuration settings, which are part of the main service configuration data.
	 *
	 * @access public
	 * @throws Error if called before _initDeployConfig has been executed and it's returned promise has been resolved.
	 * @type {Object}
	 */
	get deployConfig() {

		// Locals
		let me = this;

		// Ensure we have the deployment config cached...
		if( me._deployConfig === undefined || me._deployConfig === null ) {

			me.$throw(
				"config.not.loaded",
				"Attempted to read the deployment configuration before it had been loaded; ensure that the ConfigManager has finished loading the configuration before attempting to access the 'deployConfig' property."
			);

		}

		// Return it..
		return me._deployConfig;

	}

	/**
	 * Returns the 'Modules' property from the `deployConfig` object, after
	 * a bit of parsing.
	 *
	 * @see deployConfig
	 * @returns {Array} Array of deployment module configurations.
	 */
	get moduleConfigs() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Caching
		if ( me._moduleConfigs === undefined ) {

			// Get the full deploy config
			let config = me.deployConfig;

			// Init Cache Object
			me._moduleConfigs = [];

			// Copy enabled modules (include: true) over to the
			// internal module config cache object..
			_.each( config.Modules, function ( module ) {

				if ( module.include !== undefined && module.include === true ) {

					// We no longer need this property...
					delete module.include;

					// Copy it over..
					me._moduleConfigs.push( module );

				} else if ( module.type !== undefined ) {

					me.$log(
						"warning",
						"module.disabled",
						"An instance of a '" + module.type + "' deployment module is disabled and will not be executed!"
					);

				}

			} );

		}

		// All done..
		return me._moduleConfigs;

	}


	// </editor-fold>

	// <editor-fold desc="--- Modules --------------------------------------------------------------------------------">

	/**
	 * Instantiates (as needed) and returns all of the "Module" helper
	 * objects (children of ./module/BaseMetaDeployModule) based on the provided
	 * `Modules` configuration in meta-deploy.yml.
	 *
	 * @access public
	 * @returns {BaseMetaDeployModule[]} Array of deployment modules.
	 */
	get modules() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Caching
		if ( me._modules !== undefined ) {

			return me._modules;
		}

		// Tell someone ...
		me.$log( "info", "module.init", "Initializing Modules ..." );

		// Get the module config..
		let moduleConfigs = me.moduleConfigs;

		// Init cache object
		me._modules = [];

		// Instantiate each module
		_.each( moduleConfigs, function ( cfg ) {

			// Extract the module's class name
			let className = cfg.type;

			delete cfg.type;

			// Attach this class to the config
			cfg.metaDeploymentManager = me;

			// Attach the deploy targets to the config
			cfg.targets = me.targets;

			// Instantiate the module class/object
			let mod = me.$spawn( "microservicesLib", "deploy/module/" + className, cfg );

			// Persist the target class/object
			me._modules.push( mod );

		} );

		// All done
		return me._modules;
	}

	// </editor-fold>

	// <editor-fold desc="--- Targets --------------------------------------------------------------------------------">

	/**
	 * Returns the 'DeployTargets' property from the `deployConfig` object,
	 * after a bit of parsing.
	 *
	 * @access public
	 * @see deployConfig
	 * @returns {Array} Array of target configurations.
	 */
	get targetConfigs() {

		return this.deployConfig.DeployTargets;
	}

	/**
	 * Instantiates (as needed) and returns all of the "Deploy Target" helper
	 * objects (children of ./target/BaseMetaDeployTarget) based on the provided
	 * `DeployTargets` configuration in meta-deploy.yml.
	 *
	 * @access public
	 * @returns {BaseMetaDeployTarget[]} Array of deploy targets.
	 */
	get targets() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Caching
		if ( me._targets !== undefined ) {

			return me._targets;
		}

		// Tell someone ...
		me.$log( "info", "target.init", "Initializing Deploy Targets ..." );

		// Get the target configs..
		let targetConfigs = me.targetConfigs;

		// Init cache object
		me._targets = [];

		// Instantiate each target
		_.each( targetConfigs, function ( cfg ) {

			// Extract the target's class name
			let className = cfg.type;

			delete cfg.type;

			// Attach this class to the config
			cfg.metaDeploymentManager = me;

			// Instantiate the target class/object
			let target = me.$spawn( "microservicesLib", "deploy/target/" + className, cfg );

			// Persist the target class/object
			me._targets.push( target );
		} );

		// All done
		return me._targets;

	}

	/**
	 * Prepare targets for deployment.
	 *
	 * @returns {Promise<Array<void>>} Void.
	 */
	prepareTargets() {

		// Locals
		let me = this;

		let targets			= me.targets;
		let prepPromises	= [];

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Run 'prepare' on each target..
		_.each( targets, function ( target ) {

			prepPromises.push( target.prepare() );
		} );

		// Return a promise that resolves after
		// all targets have been prepared.
		return Promise.all( prepPromises );

	}

	// </editor-fold>

}

module.exports = MetaDeploymentManager;
