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
	 * @returns {Promise}
	 */
	execute() {

		// Locals
		let me = this;

		// Deps
		const _ = me.$dep("lodash");
		const bb = me.$dep("bluebird");

		// Tell someone...
		me.$log( "notice", "start", "The Metadata Deployment Manager is starting up ...");

		// First, prepare all of the targets..
		return me.prepareTargets().then(

			function mainMetaDeploymentWrapper() {

				// Deploy to each target..
				return bb.mapSeries( me.modules,

					function( module, index ) {

						me.$log("info", "module.execute", "Deferring to Module: " + module.constructor.name );
						return module.execute();

					}

				).then(

					function( allModuleResults ) {

						me.$log( "notice", "end", "Metadata deployment complete; exiting.");

					}

				);

			}

		);



	}


	//<editor-fold desc="--- Config Loading (deploy-config.yml) --------------">




	/**
	 * Resolves the expected, absolute, path for the config/meta-deploy.yml file.
	 *
	 * @access public
	 * @returns {string}
	 */
	get deployConfigPath() {

		// Locals
		let me = this;

		// Deps
		const PATH = me.$dep("path");

		// Resolve the path and return it
		return PATH.join( me.serviceRootPath, "config/meta-deploy.yml" );

	}

	/**
	 * Loads configuration data from config/meta-deploy.yml and returns the
	 * full configuration as an object.
	 *
	 * @access public
	 * @throws Error if the meta-deploy.yml file cannot be found or read.
	 * @returns {object}
	 */
	get deployConfig() {

		// Locals
		let me = this;
		let config;

		// Deps
		const TIPE = me.$dep("tipe");

		// Caching...
		if( me._deployConfig !== undefined ) {
			return me._deployConfig;
		}

		// Read meta-deploy.yml
		try {
			config = this.loadYamlFile( this.deployConfigPath );
		} catch( err ) {
			me.$throw("deploy.config.syntax.error", err, "Could not read 'config/meta-deploy.yml'" );
		}

		// Require that the meta-deploy.yml file has at least one item
		// defined in the "DeployTargets" property (array).
		if( config.DeployTargets === undefined || TIPE( config.DeployTargets ) !== "array" ||
			config.DeployTargets.length === 0 ) {

			me.$throw("deploy.config.no.targets", "MetaDeploymentManager requires at least one deployment target! (DeployTargets)" );

		}

		// Require that the meta-deploy.yml file has at least one item
		// defined in the "Modules" property (array).
		if( config.Modules === undefined || TIPE( config.Modules ) !== "array" ||
			config.Modules.length === 0 ) {

			me.$throw("deploy.config.no.modules", "MetaDeploymentManager requires at least one module to be defined! (Modules)" );

		}

		// Replace variables in config data
		config = me._parseObjectForVariables( config, {} );

		// Cache the config
		me._deployConfig = config;

		// .. and return it..
		return config;

	}




	//</editor-fold>

	//<editor-fold desc="--- Modules -----------------------------------------">




	/**
	 * Returns the 'Modules' property from the `deployConfig` object, after
	 * a bit of parsing.
	 *
	 * @see deployConfig
	 * @returns {array}
	 */
	get moduleConfigs() {

		// Locals
		let me = this;
		let moduleConfig;

		// Deps
		const _ = me.$dep("lodash");

		// Caching
		if( me._moduleConfigs === undefined ) {

			// Get the full deploy config
			let config = me.deployConfig;

			// Init Cache Object
			me._moduleConfigs = [];

			// Copy enabled modules (include: true) over to the
			// internal module config cache object..
			_.each( config.Modules, function( module, index ) {

				if( module.include !== undefined && module.include === true ) {

					// We no longer need this property...
					delete module.include;

					// Copy it over..
					me._moduleConfigs.push( module );

				} else {

					if( module.type !== undefined ) {

						me.$log("warning", "module.disabled", "An instance of a '" + module.type + "' deployment module is disabled and will not be executed!");

					}

				}

			});

		}

		// All done..
		return me._moduleConfigs;

	}

	/**
	 * Instantiates (as needed) and returns all of the "Module" helper
	 * objects (children of ./module/BaseMetaDeployModule) based on the provided
	 * `Modules` configuration in meta-deploy.yml.
	 *
	 * @access public
	 * @returns {BaseMetaDeployModule[]}
	 */
	get modules() {

		// Locals
		let me = this;

		// Deps
		const _ = me.$dep("lodash");

		// Caching
		if( me._modules !== undefined ) {
			return me._modules;
		}

		// Tell someone ...
		me.$log("info", "module.init", "Initializing Modules ..." );

		// Get the module config..
		let moduleConfigs = me.moduleConfigs;

		// Init cache object
		me._modules = [];

		// Instantiate each module
		_.each( moduleConfigs, function( cfg ) {

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

		});

		// All done
		return me._modules;

	}




	//</editor-fold>

	//<editor-fold desc="--- Targets -----------------------------------------">




	/**
	 * Returns the 'DeployTargets' property from the `deployConfig` object,
	 * after a bit of parsing.
	 *
	 * @access public
	 * @see deployConfig
	 * @returns {array}
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
	 * @returns {BaseMetaDeployTarget[]}
	 */
	get targets() {

		// Locals
		let me = this;

		// Deps
		const _ = me.$dep("lodash");

		// Caching
		if( me._targets !== undefined ) {
			return me._targets;
		}

		// Tell someone ...
		me.$log("info", "target.init", "Initializing Deploy Targets ..." );

		// Get the target configs..
		let targetConfigs = me.targetConfigs;

		// Init cache object
		me._targets = [];

		// Instantiate each target
		_.each( targetConfigs, function( cfg ) {

			// Extract the target's class name
			let className = cfg.type;
			delete cfg.type;

			// Attach this class to the config
			cfg.metaDeploymentManager = me;

			// Instantiate the target class/object
			let target = me.$spawn( "microservicesLib", "deploy/target/" + className, cfg );

			// Persist the target class/object
			me._targets.push( target );

		});

		// All done
		return me._targets;

	}

	prepareTargets() {

		// Locals
		let me = this;
		let targets = me.targets;
		let prepPromises = [];

		// Dependencies
		const _ = me.$dep("lodash");

		// Run 'prepare' on each target..
		_.each( targets, function( target ) {
			prepPromises.push( target.prepare() );
		});

		// Return a promise that resolves after
		// all targets have been prepared.
		return Promise.all( prepPromises );

	}




	//</editor-fold>

}

module.exports = MetaDeploymentManager;


/*

// Dependencies
const YAML	= me.$dep( "js-yaml" );
const FS	= me.$dep( "fs" );

================================================================================

static loadYamlFile( absPath, property ) {
non-static: loadYamlFile( absPath, property ) {

================================================================================

// Create a "DebugHelper"...
let deb = me.$spawn( "commonLib", "util/DebugHelper" );

// Dump the config data
deb.dbg( resolvedConfig, true, 1 );

// ---- alt

get $debugger() {
$inspect( varToInspect, output, indent, title )

================================================================================

return me._loadCommonConfigFile( "provider.yml", "provider" );

================================================================================

me.$log(
	"trace",
	"Instantiating class ('" + name + "')"
);

================================================================================

_getDirContentsRecursive( absPathToRead, initialStore )

================================================================================

_parseStringForVariables( str, vars ) {

 */
