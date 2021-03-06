/**
 * @file Defines the BaseGenerator class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.1.15
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseClass = require( "@corefw/common" ).common.BaseClass;

/**
 * Defines the base class for special utilities called "Generators", which
 * generate various files and artifacts based on service and endpoint
 * configuration data.
 *
 * @abstract
 * @memberOf Util
 * @extends Common.BaseClass
 */
class BaseGenerator extends BaseClass {

	/**
	 * @inheritDoc
	 */
	_initialize( cfg ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Call parent
		super._initialize( cfg );

		if ( !_.isPlainObject( cfg ) || !_.isString( cfg.serviceRootPath ) ) {

			throw new Error(
				"All generators require the 'serviceRootPath' configuration " +
				"property to be defined when being instantiated."
			);

		}

		// Store the absolute path to the target service
		me._serviceRootPath = cfg.serviceRootPath;

		// Store the service name, if provided. It not provided it will be
		// determined automatically from the service's package.json name.
		me._serviceName = cfg.serviceName;

		// Store KmsCrypt config. This is used to decrypt sensitive information
		// stored in S3 and KMS.
		me._kmsCryptConfig = cfg.kmsCryptConfig;

		// If a 'configVariant' was defined in the constructor config,
		// save it...
		if ( cfg.configVariant !== undefined && cfg.configVariant !== null ) {

			me._configVariant = cfg.configVariant;
		}

		// Initialize a logger object
		me._initLogger();
	}

	/**
	 * Initializes the main service configuration by instantiating a 'ConfigManager' object and,
	 * then, telling it to load the service configuration.
	 *
	 * @private
	 * @throws Error if the configuration cannot be loaded or is invalid.
	 * @returns {Promise<Object>} A promise resolved with the full service configuration data.
	 */
	_initConfig() {

		// Locals
		let me = this;

		// Initialize a ConfigurationManager object...
		let cfm = me.$spawn( "microservicesLib", "config/ConfigManager", {} );

		// Persist the configuration manager
		me.configManager = cfm;

		// Load the config...
		return cfm.loadConfig();

	}

	// <editor-fold desc="--- Common/Global Variables ----------------------------------------------------------------">

	/**
	 * Finds and reads the contents of the services' package.json file, with
	 * caching.
	 *
	 * @access public
	 * @throws Error if the package.json cannot be found, or read.
	 * @returns {Object} Package data.
	 */
	get packageData() {

		// Locals
		let me = this;

		// Caching...
		if ( me._packageData === undefined ) {

			// Dependencies
			const PATH = me.$dep( "path" );

			// Resolve the expected path to package.json
			let pkgPath = PATH.join( me.serviceRootPath, "package.json" );

			// Read package.json
			try {

				me._packageData = require( pkgPath );

			} catch ( err ) {

				me.$throw(
					"missing.package-json",
					"Failed to load the services' package.json file"
				);
			}
		}

		// All done..
		return me._packageData;
	}

	/**
	 * Resolves the name of the service by looking at the contents of
	 * package.json and returning the 'version' field (verbatim).
	 *
	 * @access public
	 * @throws Error if the 'version' field cannot be found in the package.json file, or if it appears to be invalid.
	 * @returns {string} Full version of service.
	 */
	get versionFull() {

		// Locals
		let me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Load the contents of package.json
		let pkg = me.packageData;

		// Ensure that the 'version' property is provided and
		// appears to be valid.
		if (
			pkg.version === undefined ||
			TIPE( pkg.version ) !== "string" ||
			pkg.version === ""
		) {

			me.$throw(
				"missing.version",
				"Missing or Invalid 'version' specified in package.json"
			);
		}

		// All done..
		return pkg.version;
	}

	/**
	 * Resolves the MAJOR version of the service by looking at the contents of
	 * package.json and parsing the first number in the 'version' property.
	 *
	 * @access public
	 * @throws Error if the major version cannot be resolved.
	 * @returns {string} Major version of service.
	 */
	get versionMajor() {

		let me = this;

		let fv	= me.versionFull;
		let spl	= fv.split( "." );

		if ( spl.length === 0 ) {

			me.$throw(
				"invalid.version",
				"Could not resolve service major version from package.json"
			);
		}

		return spl[ 0 ];
	}

	/**
	 * Resolves the MINOR version of the service by looking at the contents of
	 * package.json and parsing the second number in the 'version' property.
	 *
	 * Note: If the MINOR version cannot be resolved, this function will return
	 * the literal string "0" (zero).
	 *
	 * @access public
	 * @returns {string} Minor version of service.
	 */
	get versionMinor() {

		// Locals
		let me = this;

		// Fetch the full version string
		let fv = me.versionFull;

		// Split the full version string
		let spl = fv.split( "." );

		// Check for our MINOR version
		if ( spl.length < 2 ) {

			// It could not be found, return "0"
			return "0";
		}

		// Found the MINOR version, return it as a string..
		return spl[ 1 ];
	}

	/**
	 * Resolves the REVISION version of the service by looking at the contents of
	 * package.json and parsing the third number in the 'version' property.
	 *
	 * Note: If the REVISION version cannot be resolved, this function will return
	 * the literal string "0" (zero).
	 *
	 * @access public
	 * @returns {string} Revision version of service.
	 */
	get versionRevision() {

		// Locals
		let me = this;

		// Fetch the full version string
		let fv = me.versionFull;

		// Split the full version string
		let spl = fv.split( "." );

		// Check for our REVISION version
		if ( spl.length < 3 ) {

			// It could not be found, return "0"
			return "0";
		}

		// Found the REVISION version, return it as a string..
		return spl[ 2 ];
	}

	/**
	 * Resolves the current Git branch by looking for and reading the
	 * local .git/HEAD file.
	 *
	 * @access public
	 * @throws Error If the file could not be found, read, or if the contents
	 * are not recognized as valid.
	 * @returns {string} Current Git branch.
	 */
	get gitBranch() {

		// Locals
		let me = this;

		// Let's see if someone just _gave_ it to us in the ENV
		if ( process.env.GIT_BRANCH !== undefined ) {

			return process.env.GIT_BRANCH;

		} else if ( process.env.TRAVIS_BRANCH !== undefined ) {

			return process.env.TRAVIS_BRANCH;
		}

		// Dependencies
		const FS	= me.$dep( "fs" );
		const PATH	= me.$dep( "path" );
		const _		= me.$dep( "lodash" );

		// Resolve the expected path to .git/HEAD
		let gitHeadPath = PATH.join( me.serviceRootPath, ".git/HEAD" );

		let gitHeadContents;
		let gitHeadSplit;
		let gitBranch;

		// Read the .git/HEAD file
		try {

			gitHeadContents = FS.readFileSync( gitHeadPath, "utf8" );

		} catch ( err ) {

			me.$throw(
				"missing.git.head",
				"Missing .git/HEAD file, which is required to resolve the current Git branch"
			);
		}

		// Parse out invalid characters
		gitHeadContents = gitHeadContents.replace( /[^a-zA-Z0-9\-:\/.]+/g, "" );

		// Simple check for validity (this is not very comprehensive)
		if ( !_.startsWith( gitHeadContents, "ref:" ) || gitHeadContents.indexOf( "/" ) === -1 ) {

			me.$throw(
				"invalid.git.head",
				"Could not resolve the current Git Branch, the contents of .git/HEAD were not recognized."
			);
		}

		// Reduce the contents of .git/HEAD to a simple branch name..
		gitHeadSplit	= gitHeadContents.split( "/" );
		gitBranch		= gitHeadSplit[ gitHeadSplit.length - 1 ];

		// All done, return the branch name..
		return gitBranch;
	}

	/**
	 * Returns a key/value object containing common, global, variables that should be available to all dynamic configs.
	 *
	 * @public
	 * @returns {Object} Common global variables.
	 */
	get commonGlobalVariables() {

		// Locals
		let me = this;

		return {
			versionMajor     : me.versionMajor,
			versionMinor     : me.versionMinor,
			versionRevision  : me.versionRevision,
			versionFull      : me.versionFull,
			serviceName      : me.serviceName,
			serviceNameShort : me.serviceNameShort,
			gitBranch        : me.gitBranch,
		};
	}

	/**
	 * The service name. If not provided explicitly during class initialization, then it will be determined
	 * automatically using the service project's package.json file.
	 *
	 * @public
	 * @type {string}
	 * @throws Error if the serviceName was not provided as a configuration option to the generator AND the 'name' field
	 * cannot be found in the package.json file, or if it appears to be invalid.
	 * @readonly
	 */
	get serviceName() {

		// Locals
		const me = this;

		// Dependencies
		const _		= me.$dep( "lodash" );
		const TIPE	= me.$dep( "tipe" );

		if ( _.isNil( me._serviceName ) ) {

			// Fetch the package.json contents..
			let pkg = me.packageData;

			// Ensure we have a 'name' field
			if ( pkg.name === undefined || TIPE( pkg.name ) !== "string" || pkg.name === "" ) {

				me.$throw(
					"missing.service.name",
					"Missing or Invalid service 'name' specified in package.json"
				);
			}

			me._serviceName = pkg.name;
		}

		return me._serviceName;
	}

	/**
	 * A shortened version of the service name.
	 *
	 * @public
	 * @type {string}
	 * @throws Error if the serviceName was not provided as a configuration option to the generator AND the 'name' field
	 * cannot be found in the package.json file, or if it appears to be invalid.
	 * @readonly
	 */
	get serviceNameShort() {

		// Locals
		const me = this;
		let serviceName = me.serviceName;

		// Dependencies
		const _		= me.$dep( "lodash" );

		if ( _.isNil( me._serviceNameShort ) ) {
			me._serviceNameShort = serviceName.replace( "sls-service-", "" );
		}

		return me._serviceNameShort;
	}

	// </editor-fold>

	/**
	 * The absolute path to the Serverless config directory in
	 * core-microservices, based on the generators current `configVariant`
	 * setting (e.g. `serverless/config/default`).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get commonConfigRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join(
			me.toolsLibRoot,
			"serverless/config",
			me.configVariant
		);
	}

	/**
	 * The absolute path to the common schema directory in
	 * core-microservices (`schema`).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get commonSchemaRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.toolsLibRoot, "schema" );
	}

	/**
	 * The absolute path to the common schema definitions directory
	 * in core-microservices (`schema/definitions`).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get commonSchemaDefinitionRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.commonSchemaRoot, "definitions" );
	}

	/**
	 * The absolute path to the root directory (repo/project root) for
	 * the service that this generator is generating files or artifacts for.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get serviceRootPath() {

		const me = this;

		return me._serviceRootPath;
	}

	/**
	 * KmsCrypt configuration data. Used to decrypt and apply sensitive
	 * information via S3 and KMS services.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get kmsCryptConfig() {

		const me = this;

		return me._kmsCryptConfig;
	}

	/**
	 * The absolute path to the 'endpoints' directory (`lib/endpoints`) for
	 * the service that this generator is generating files or artifacts for.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get serviceEndpointPath() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.serviceRootPath, "lib", "endpoints" );
	}

	/**
	 * The absolute path to the 'models' directory (`lib/models`) for
	 * the service that this generator is generating files or artifacts for.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get serviceModelRootPath() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.serviceRootPath, "lib", "models" );
	}

	/**
	 * Provides a way for implementors to specify a different set of
	 * common config/schema/etc that this generator will use when
	 * generating files and artifacts.
	 *
	 * @public
	 * @type {string}
	 * @default "default"
	 */
	get configVariant() {

		const me = this;

		if ( me._configVariant === undefined || me._configVariant === null ) {

			return "default";
		}

		return me._configVariant;
	}

	set configVariant( /** string */ newVal ) {

		const me = this;

		me._configVariant = newVal;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * The path to the root directory of this library (core-microservices).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get toolsLibRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( __dirname, "../.." );
	}

	/**
	 * Reads the contents of a "common file" and returns it as a string.
	 *
	 * @protected
	 * @param {string} relPath - The relative path of the file to read; this
	 *     path should be relative to the `commonConfigRoot` path.
	 * @returns {Buffer | string} The file contents.
	 */
	_readCommonFile( relPath ) {

		const me = this;

		// Dependencies
		const PATH	= me.$dep( "path" );
		const FS	= me.$dep( "fs" );

		// Resolve absolute path
		let absPath = PATH.join( me.commonConfigRoot, relPath );

		// Read the file and return it
		return FS.readFileSync( absPath, {
			encoding: "utf-8",
		} );
	}

	/**
	 * Reads the contents of a "common YAML file" (via `loadYamlFile()`)
	 * and returns it as an object.
	 *
	 * @protected
	 * @param {string} relPath - The relative path of the file to read; this
	 *     path should be relative to the `commonConfigRoot` path.
	 * @param {?string} [property=null] - When provided, and not null, this
	 *     method will return the value of a property from within the loaded
	 *     YAML file. If not provided, or NULL, then the root object will be
	 *     returned.
	 * @returns {Object} The file contents.
	 */
	_loadCommonConfigFile( relPath, property ) {

		// Locals
		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		// Resolve the absolute path to the file
		let absPath = PATH.join( me.commonConfigRoot, relPath );

		// Load the file
		let configData = me.loadYamlFile( absPath, property );

		// Common variable parsing
		configData = me._parseObjectForVariables( configData );

		// Return
		return configData;
	}

	/**
	 * Reads the contents of a "common schema file" (via `loadYamlFile()`)
	 * and returns it as an object.
	 *
	 * @protected
	 * @param {string} relPath - The relative path of the file to read; this
	 *     path should be relative to the `commonSchemaRoot` path.
	 * @param {?string} [property=null] - When provided, and not null, this
	 *     method will return the value of a property from within the loaded
	 *     YAML file. If not provided, or NULL, then the root object will be
	 *     returned.
	 * @returns {Object} The file contents.
	 */
	_loadCommonSchemaFile( relPath, property ) {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		let absPath = PATH.join( me.commonSchemaRoot, relPath );

		return me.loadYamlFile( absPath, property );

	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Reads the contents of a JSON file (via `require()`) and returns
	 * it as an object.
	 *
	 * @protected
	 * @param {string} absPath - The absolute path of the file to read
	 * @param {?string} [property=null] - When provided, and not null, this
	 *     method will return the value of a property from within the loaded
	 *     JSON file. If not provided, or NULL, then the root object will be
	 *     returned.
	 * @returns {Object} The file contents.
	 */
	_loadJsonFile( absPath, property ) {

		const data = require( absPath );

		if ( property === undefined || property === null ) {

			return data;
		}

		return data[ property ];
	}

	/**
	 * Returns the details of a single service endpoint.
	 *
	 * @uses getServiceEndpoints
	 * @public
	 * @param {string} endpointName - The name of the endpoint to return the
	 *     details for. This value is case-insensitive.
	 * @param {boolean} [force=false] - When TRUE, the details of all endpoints
	 *     will be reloaded, from disk, before this method returns a value.
	 * @returns {?Object} The details of one endpoint or NULL if the
	 *     endpoint was not found or is invalid.
	 */
	getServiceEndpoint( endpointName, force ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let allEndpoints = me.getServiceEndpoints( force );
		let ret = null;

		endpointName = endpointName.toLowerCase();

		_.each( allEndpoints, function ( epDetails, epName ) {

			if ( endpointName === epName.toLowerCase() ) {

				ret = epDetails;

				return false;
			}

			return true;
		} );

		return ret;

	}

	/**
	 * Returns the details of all endpoints within the target service.
	 *
	 * @public
	 * @param {boolean} [force=false] - When TRUE, the details of all endpoints
	 *     will be reloaded, from disk, before this method returns a value.
	 * @returns {?Object} A plain object containing the details of every
	 *     endpoint, keyed by endpoint name.
	 */
	getServiceEndpoints( force ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Param validation/coercion
		if ( force !== true ) {

			force = false;
		}

		if ( force || me._endpointDetailsCache === undefined ) {

			// Scan the endpoints directory for files
			// named 'serverless-function.yml'
			let pattern = /serverless-function\.yml/;

			let epConfigFiles = me._findFilesWithPattern(
				me.serviceEndpointPath,
				pattern
			);

			// Initialize the return object
			let endpointDetails = {};

			// Iterate over each endpoint, building each one's details
			_.each( epConfigFiles, function ( configFileInfo, configFilePath ) {

				// Defer to `_resolveEndpointDetails` for the bulk of the work
				let epDetails = me._resolveEndpointDetails( configFilePath );

				// Persist the endpoint details to the return object
				endpointDetails[ epDetails.endpointName ] = epDetails;
			} );

			// Store the endpoint details in a memory cache
			me._endpointDetailsCache = endpointDetails;
		}

		// All done
		return me._endpointDetailsCache;

	}

	/**
	 * Resolves the details of a single service endpoint when given
	 * the path to that endpoint's `serverless-function.yml` file.
	 *
	 * @private
	 * @param {string} configPath - The absolute path to an endpoint's
	 *     `serverless-function.yml` configuration file.
	 * @returns {Object} The endpoint details.
	 */
	_resolveEndpointDetails( configPath ) {

		// Locals
		const me = this;

		// Dependencies
		const CRYPTO 	= require( "crypto" );
		const PATH 		= me.$dep( "path" );

		// Config Path
		let spl = configPath.split( PATH.sep );

		// Init the return
		let ret = {
			functionConfigPath: configPath,
		};

		// Append config file name
		ret.functionConfigFilename = spl.pop();

		// Append the config path
		ret.configRootPath	= spl.join( PATH.sep );
		ret.configDirName	= spl.pop();

		// Append the endpoint root directory
		ret.endpointRoot	= spl.join( PATH.sep );
		ret.endpointRootRel	= ret.endpointRoot.replace( me.serviceRootPath, "" );

		// Append the endpoint [class] name
		ret.endpointName = spl[ spl.length - 1 ];

		// Append the http method
		ret.httpMethod		= spl[ spl.length - 2 ];
		ret.httpMethodUC	= ret.httpMethod.toUpperCase();
		ret.httpMethodLC	= ret.httpMethod.toLowerCase();

		// Resolve the schema directory
		ret.schemaRootPath = PATH.join( ret.endpointRoot, "schema" );

		// Parameter config
		ret.parameterConfigPath = PATH.join(
			ret.schemaRootPath, "Parameters.yml"
		);

		ret.parameterConfig = me._loadParameterConfig( ret );

		// Path config
		ret.pathConfigPath = PATH.join(
			ret.schemaRootPath, "Path.yml"
		);

		ret.pathConfig = me._loadPathConfig( ret );

		// Generate a Unique ID
		// This was added, primarily, as a mechanism that the ServiceAggregator could
		// use to cross-reference the data in each service's serverless.json file with
		// the actual Lambda functions in AWS.
		ret.endpointVersionString =
			me.serviceName + "::" +
			ret.endpointName + "::" +
			me.gitBranch + "::" +
			me.versionFull;

		ret.endpointVersionHash = CRYPTO
			.createHash( "md5" )
			.update( ret.endpointVersionString )
			.digest( "hex" );

		// Load and parse the function config
		ret.functionConfig = me._loadEpFunctionConfig( ret );

		// Done
		return ret;
	}

	/**
	 * A plain object containing default values for function configurations;
	 * these defaults will be loaded from the common config file,
	 * 'function-defaults.yml', and will be used to fill in any values that
	 * a loaded 'serverless-function.yml' file does not define.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get functionDefaults() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Read from cache or load the config file...
		if (
			me._functionDefaults === undefined ||
			me._functionDefaults === null
		) {

			me._functionDefaults =
				me._loadCommonConfigFile( "function-defaults.yml" );
		}

		// Out of paranoia, we clone the default config
		// to ensure that it cannot be modified by
		// subsequent processing.
		return _.cloneDeep( me._functionDefaults );
	}

	/**
	 * A plain object containing default values for 'http' events within
	 * function configurations; these defaults will be loaded from the common
	 * config file, 'http-event-defaults.yml', and will be used to fill in any
	 * values that any http events declarations do not define.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get httpEventDefaults() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Read from cache or load the config file...
		if (
			me._httpEventDefaults === undefined ||
			me._httpEventDefaults === null
		) {

			me._httpEventDefaults =
				me._loadCommonConfigFile( "http-event-defaults.yml" );
		}

		// Out of paranoia, we clone the default config
		// to ensure that it cannot be modified by
		// subsequent processing.
		return _.cloneDeep( me._httpEventDefaults );
	}

	/**
	 * A plain object containing default values for 'http' events that
	 * are automatically created by the path found within an endpoint's Path.yml
	 * schema definition file.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get httpEventScaffold() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Read from cache or load the config file...
		if (
			me._httpEventScaffold === undefined ||
			me._httpEventScaffold === null
		) {

			me._httpEventScaffold =
				me._loadCommonConfigFile( "http-event-scaffold.yml" );
		}

		// Out of paranoia, we clone the default config
		// to ensure that it cannot be modified by
		// subsequent processing.
		return _.cloneDeep( me._httpEventScaffold );
	}

	/**
	 * This helper method assists `_resolveEndpointDetails()` by loading
	 * the `serverless-function.yml` configuration file and parsing it
	 * for special variables.
	 *
	 * @private
	 * @param {Object} epDetailsObj - A special endpoint details object that
	 *     is constructed by `_resolveEndpointDetails()`
	 * @returns {Object} The endpoint function configuration.
	 */
	_loadEpFunctionConfig( epDetailsObj ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let defaults = me.functionDefaults;

		// Initialize an object store that will
		// be used to allow special variables in the config.
		let parseVars = {};

		// Param validation
		if ( !_.isPlainObject( epDetailsObj ) ) {

			throw new Error(
				"Missing or invalid endpoint details object (epDetailsObj) " +
				"in BaseGenerator#_loadEpFunctionConfig()."
			);
		}

		// Read the serverless-function.yml file...
		let cfg = me.loadYamlFile( epDetailsObj.functionConfigPath );

		// Apply function config defaults
		cfg = _.merge( defaults, cfg );

		// Load each endpoint detail property (built prior) into
		// a special variables object that will allow endpoint data
		// to be injected into the `serverless-function.yml` file
		// using special variables (such as `${endpointRoot}`).
		_.each( epDetailsObj, function ( val, key ) {

			// We only want to allow strings to be injected...
			if ( _.isString( val ) ) {

				parseVars[ key ] = val;
			}
		} );

		// If the provided function has a 'Path.yml' configuration,
		// then we will ensure that the path within it is automatically
		// declared as an 'http' event.
		cfg = me._addAutomaticEventsToFunction( cfg, epDetailsObj );

		// Apply event defaults
		cfg = me._applyEventDefaults( cfg );

		// Parse the config object from `serverless-function.yml`, injecting
		// the endpoint data variables as necessary.
		cfg = me._parseObjectForVariables( cfg, parseVars );

		// All done
		return cfg;
	}

	/**
	 * Applies function-event-level defaults from the Serverless
	 * config templates.
	 *
	 * @private
	 * @param {Object} cfg - A function configuration object (from
	 *     `serverless-function.yml`)
	 * @returns {Object} The `cfg` object, with defaults applied.
	 */
	_applyEventDefaults( cfg ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Iterate over each of the function's "events"
		_.each( cfg.events, function ( eventWrapper ) {

			// Serverless event configs have a somewhat strange
			// structure, so we have to break it down a bit...
			_.each( eventWrapper, function ( ev, evType ) {

				let newConfig;

				switch ( evType.toLowerCase() ) {

					case "http":

						newConfig = _.merge( ev, me.httpEventDefaults );
						break;

					default:

						newConfig = ev;
						break;
				}

				// Apply the new config
				eventWrapper[ evType ] = newConfig;
			} );
		} );

		// All done
		return cfg;
	}

	/**
	 * This helper method assists `_loadEpFunctionConfig()` by adding automatic
	 * events to endpoint functions based on information gathered from other
	 * sources (such as the endpoint's Path.yml schema).
	 *
	 * @private
	 * @param {Object} cfg - The function's config.
	 * @param {Object} epDetailsObj - A special endpoint details object that
	 *     is constructed by `_resolveEndpointDetails()`
	 * @returns {Object} The function's config (`cfg`), potentially with
	 *     events added.
	 */
	_addAutomaticEventsToFunction( cfg, epDetailsObj ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// If the endpoint does not have a Path.yml schema, then
		// we won't add any events automatically, so we can exit early...
		if (
			epDetailsObj.pathConfig === undefined ||
			epDetailsObj.pathConfig === null
		) {

			return cfg;
		}

		// Ensure that our function config has an 'events' property
		if ( !_.isArray( cfg.events ) ) {

			cfg.events = [];
		}

		// Iterate over each path and build the event config
		_.each( epDetailsObj.pathConfig, function ( pathSchema, pathName ) {

			// Normalize path name...
			pathName = me._normalizeConfigHttpPath( pathName );

			// We will not create an automatic event if it is already
			// defined within a http event.
			if (
				!me._functionConfigHasPath(
					cfg, pathName, "http"
				)
			) {

				// Generate the new event
				let newEvent = me._buildHttpEvent( pathName, pathSchema );

				// Add the automatic event...
				cfg.events.push( newEvent );
			}
		} );

		return cfg;
	}

	/**
	 * Constructs a 'http' event configuration object for a given
	 * path schema (from within an endpoint's Path.yml schema)
	 *
	 * @private
	 * @param {string} pathName - The path from a Path.yml schema file
	 * @param {Object} pathSchema - The full schema for the path.
	 * @returns {Object} A 'http' event...
	 */
	_buildHttpEvent( pathName, pathSchema ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Start with the scaffold...
		let ret = me.httpEventScaffold;

		// Create a variables object to parse
		// for path-level variables...
		let parseVars = {
			httpPath: pathName,
		};

		// Find the HTTP method...
		_.each( pathSchema, function ( methodSchema, methodName ) {

			parseVars.httpMethod	= methodName;
			parseVars.httpMethodLC	= methodName.toLowerCase();
			parseVars.httpMethodUC	= methodName.toUpperCase();
		} );

		// Apply variables to the scaffold
		ret = me._parseObjectForVariables( ret, parseVars );

		// All done
		return ret;
	}

	/**
	 * Checks a function configuration's event property to see if the
	 * provided path has already been defined within it.
	 *
	 * @protected
	 * @param {Object} cfg - The function configuration object.
	 * @param {string} pathName - The path to check for
	 * @param {?string|string[]} [eventType=null] - If passed and non-null, then
	 *     the path will only be searched for within events of the specified
	 *     type, or types (if an array is passed). If not provided, or NULL,
	 *     then all event types will be searched.
	 * @returns {boolean} TRUE if the function config contains the provided
	 *     path, or FALSE otherwise.
	 */
	_functionConfigHasPath( cfg, pathName, eventType ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let eventTypes	= {};
		let ret			= false;

		// Normalize the path...
		pathName = me._normalizeConfigHttpPath( pathName );

		// Normalize the eventType parameter as
		// either an object or NULL
		if ( eventType === undefined || eventType === null ) {

			eventTypes = null;

		} else if ( _.isPlainObject( eventType ) ) {

			// If a plain object is passed, we'll just
			// use it verbatim...
			eventTypes = eventType;

		} else if ( _.isArray( eventType ) ) {

			// If an array is passed, we'll convert it an
			// object for easy indexing/checking.
			_.each( eventType, function ( et ) {

				et = et.toLowerCase();
				eventTypes[ et ] = et;
			} );

		} else if ( _.isString( eventType ) ) {

			// If an string is passed, we'll convert it an
			// object for easy indexing/checking.
			eventType = eventType.toLowerCase();
			eventTypes[ eventType ] = eventType;

		} else {

			// Error on anything else...
			throw new Error(
				"Invalid value passed for 'eventType' in " +
				"BaseGenerator#_functionConfigHasPath()."
			);
		}

		// Exit early if the cfg doesn't have any events...
		if (
			cfg.events === undefined ||
			!_.isArray( cfg.events ) ||
			cfg.events.length === 0
		) {

			return ret;
		}

		// Iterate over each event
		_.each( cfg.events, function ( evWrapper ) {

			// Serverless event configs have a somewhat strange
			// structure, so we have to break it down a bit...
			_.each( evWrapper, function ( ev, evType ) {

				// Types will be compared as case-insensitive
				evType = evType.toLowerCase();

				// If the path has already been found,
				// then we can stop iterating...
				if ( ret === true ) {

					return false;
				}

				// Only search for paths within certain types of events...
				if (
					eventTypes === null ||
					eventTypes[ evType ] !== undefined
				) {

					// Ensure we have a valid path...
					if ( ev.path !== undefined && _.isString( ev.path ) ) {

						let cfgPath = me._normalizeConfigHttpPath( ev.path );

						// Check the path...
						if ( cfgPath === pathName ) {

							// Set the return
							ret = true;
						}
					}
				}

				return true;
			} );
		} );

		// Done
		return ret;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Ensures that a provided API path is in the appropriate format
	 * to be used within an 'http' event as part of
	 * a Serverless function config.
	 *
	 * One of the main uses for this method is the conversion of OpenAPI
	 * specification style paths into Serverless config style paths.
	 *
	 * @protected
	 * @param {string} pathName - The path name to normalize.
	 * @returns {string} The 'pathName' parameter, after normalization.
	 */
	_normalizeConfigHttpPath( pathName ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Trim
		pathName = _.trim( pathName, " /" );

		// All done
		return pathName;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * This helper method assists `_resolveEndpointDetails()` by loading
	 * the `Parameters.yml` schema for a single endpoint, if it exists.
	 *
	 * @private
	 * @param {Object} epDetailsObj - A special endpoint details object that
	 *     is constructed by `_resolveEndpointDetails()`
	 * @returns {?Object} The contents of `Parameters.yml` or NULL if the
	 *     file was not found for the endpoint specified in `epDetailsObj`.
	 */
	_loadParameterConfig( epDetailsObj ) {

		const me = this;

		let ret;

		try {

			let tmp = me.loadYamlFile( epDetailsObj.parameterConfigPath );

			if ( tmp.parameters !== undefined && tmp.parameters !== null ) {

				ret = tmp.parameters;

			} else {

				ret = tmp;
			}

		} catch ( e ) {

			ret = null;
		}

		return ret;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * This helper method assists `_resolveEndpointDetails()` by loading
	 * the `Path.yml` schema for a single endpoint, if it exists.
	 *
	 * @private
	 * @param {Object} epDetailsObj - A special "endpoint details" object that
	 *     is constructed by `_resolveEndpointDetails()`
	 * @returns {?Object} The contents of `Path.yml` or NULL if the
	 *     file was not found for the endpoint specified in `epDetailsObj`.
	 */
	_loadPathConfig( epDetailsObj ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let pathConfig;

		try {

			pathConfig = me.loadYamlFile( epDetailsObj.pathConfigPath );

			if ( pathConfig.paths !== undefined && pathConfig.paths !== null ) {

				pathConfig = pathConfig.paths;
			}

		} catch ( e ) {

			pathConfig = null;
		}

		let pathCount = _.size( pathConfig );

		if ( pathCount > 1 ) {

			throw new Error(
				"Expected path config at '" + epDetailsObj.pathConfigPath + "' to have a single path " +
				"definition but found (" + pathCount + ") definitions instead."
			);
		}

		return pathConfig;
	}

	/**
	 * This utility method is one of many methods that facilitate the
	 * use of special variables (such as `${endpointRoot}`) inside of objects,
	 * especially objects that are loaded from JSON and YAML files.
	 *
	 * Specifically, this method will parse an object, recursively, for
	 * strings that contain any identifiers that correspond to any of the
	 * properties defined in the `vars` param object.
	 *
	 * This method is, typically, the entry point for variable resolution,
	 * since relevant JSON and YAML files will be passed, directly, into this
	 * method.
	 *
	 * @protected
	 * @param {Object} obj - The object to scan for variable identifiers.
	 * @param {Object} vars - A plain object containing variables that can be
	 *     injected into the object defined by the `obj` param.
	 * @returns {Object} The final object with all valid variable values
	 *     injected.
	 */
	_parseObjectForVariables( obj, vars ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Initialize the return
		let ret = {};

		// Iterate over each property in the target object
		_.each( obj, function ( val, key ) {

			ret[ key ] = me._parseAnyForVariables( val, vars );
		} );

		return ret;
	}

	/**
	 * This utility method is one of many methods that facilitate the
	 * use of special variables (such as `${endpointRoot}`) inside of objects,
	 * especially objects that are loaded from JSON and YAML files.
	 *
	 * Specifically, this method will evaluate a variable and route processing
	 * of that variable to more specific methods based on its type.
	 *
	 * @protected
	 * @param {*} target - The variable to scan for variable identifiers.
	 * @param {Object} vars - A plain object containing variables that can be
	 *     injected into the object defined by the `obj` param.
	 * @returns {*} The variables passed via the `target` parameter, but with
	 *     valid variable values injected.
	 */
	_parseAnyForVariables( target, vars ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		if ( _.isPlainObject( target ) ) {

			// If `target` is an object, we'll defer to the
			// method that parses objects...
			return me._parseObjectForVariables( target, vars );

		} else if ( _.isArray( target ) ) {

			// If `target` is an array, we'll defer to the
			// method that parses arrays...
			return me._parseArrayForVariables( target, vars );

		} else if ( _.isString( target ) ) {

			// If `target` is a string, we'll defer to the
			// method that parses string...
			return me._parseStringForVariables( target, vars );
		}

		// All other types will be returned verbatim, since
		// they cannot be parsed for variable identifiers.
		return target;
	}

	/**
	 * This utility method is one of many methods that facilitate the
	 * use of special variables (such as `${endpointRoot}`) inside of objects,
	 * especially objects that are loaded from JSON and YAML files.
	 *
	 * Specifically, this method will parse an array and send each of
	 * its elements to `_parseAnyForVariables`, where they will be evaluated
	 * for additional processing.
	 *
	 * @protected
	 * @param {Array} arr - The array to scan for variable identifiers.
	 * @param {Object} vars - A plain object containing variables that can be
	 *     injected into the object defined by the `obj` param.
	 * @returns {Array} The final array with all valid variable values injected.
	 */
	_parseArrayForVariables( arr, vars ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Init Return
		let ret = [];

		// Iterate over each element in the array...
		_.each( arr, function ( val ) {

			// Defer each element to `_parseAnyForVariables`,
			// for additional processing...
			ret.push( me._parseAnyForVariables( val, vars ) );
		} );

		// All done
		return ret;
	}

	/**
	 * This utility method is one of many methods that facilitate the
	 * use of special variables (such as `${endpointRoot}`) inside of objects,
	 * especially objects that are loaded from JSON and YAML files.
	 *
	 * Specifically, this method will parse a string for variable identifiers,
	 * and, when found, will inject the values from the `vars` object.
	 *
	 * Since variable identifiers can only be represented as strings, this
	 * method is the actual injection mechanism for the variable system. All
	 * of the other methods just allow for recursive processing.
	 *
	 * @protected
	 * @param {string} str - The string to parse for variable identifiers.
	 * @param {Object} vars - A plain object containing variables that can be
	 *     injected into the object defined by the `obj` param.
	 * @returns {*} The resolved variable, after variable values have been
	 *     injected.
	 */
	_parseStringForVariables( str, vars ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Init return
		let ret = str;

		// Mix the global variables in, if they are not already..
		vars = Object.assign( me.commonGlobalVariables, vars );

		// Iterate over each available variable and check
		// to see if the identifier is present in the string.
		_.each( vars, function ( varVal, varName ) {

			// Resolve the identifier to search for...
			// e.g. { a: ... } -> "${a}"
			let varIdentifier = "${" + varName + "}";

			// If a previous variable has modified the 'type' of
			// our return (so that it is no longer a string), then
			// we won't process any additional variables.
			if ( ret.indexOf !== undefined ) {

				if ( _.isString( varVal ) ) {

					// If our current variable value is a string, we're going
					// to do a search and replace operation...
					while ( ret.indexOf( varIdentifier ) !== -1 ) {

						// Replace...
						ret = ret.replace( varIdentifier, varVal );
					}

					// If our current variable value is not a string, then
					// we'll return the full variable value if its identifier
					// is found in the string.

				} else if ( ret.indexOf( varIdentifier ) !== -1 ) {

					// Return the full value
					ret = varVal;

					// Stop iteration
					return false;
				}
			}

			return true;
		} );

		// All done
		return ret;
	}

	/**
	 * Searches for files, recursively, within a given `basePath`, whose
	 * absolute path matches a given regular expression pattern (`pattern`).
	 *
	 * @access protected
	 * @param {string} basePath - The file system path to search
	 * @param {RegExp} pattern - The regular expression to test each absolute
	 *     path against.
	 * @returns {Object} A plain-object, keyed by absolute paths, that
	 *     contains information about each file that was matched/found.
	 */
	_findFilesWithPattern( basePath, pattern ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let allFiles = me._getFilesRecursive( basePath );
		let ret = {};

		_.each( allFiles, function ( item, absPath ) {

			if ( pattern.test( absPath ) ) {

				ret[ absPath ] = item;
			}
		} );

		return ret;
	}

	/**
	 * Returns information about ALL files found after a recursive scan
	 * of the provided `basePath`.
	 *
	 * @access protected
	 * @uses _getDirContentsRecursive
	 * @param {string} basePath - The file system path to scan/walk.
	 * @returns {Object} A plain-object, keyed by absolute paths, that
	 *     contains information about each file within the provided `basePath`.
	 */
	_getFilesRecursive( basePath ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Init return object
		let ret = {};

		// Get ALL items (files + dirs) for the path
		let allItems = me._getDirContentsRecursive( basePath );

		// Iterate over each item and, for each item that is not
		// a directory, add it to the return.
		_.each( allItems, function ( item, absPath ) {

			// Ignore directories...
			if ( item.isDirectory === false ) {

				// Return files...
				ret[ absPath ] = item;
			}
		} );

		// All done
		return ret;
	}

	/**
	 * Returns information about ALL items (including both files and
	 * directories) found after a recursive scan of the provided
	 * `absPathToRead`.
	 *
	 * @protected
	 * @param {string} absPathToRead - The file system path to scan/walk.
	 * @param {?Object} [initialStore=null] - This optional object is used
	 *     to facilitate recursive scanning by providing a single object/ref
	 *     to store all items within. You usually will not need to pass this
	 *     parameter because it will be created, automatically, by the top-most
	 *     call to this method.
	 * @returns {Object[]} A plain-object, keyed by absolute paths, that
	 *     contains information about each item (files+dirs) within the provided
	 *     `absPathToRead`.
	 */
	_getDirContentsRecursive( absPathToRead, initialStore ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Init return
		let ret;

		// Create an object store, if one was not provided as a param
		if ( initialStore !== undefined && initialStore !== null ) {

			ret = initialStore;

		} else {

			ret = {};
		}

		// Build the contents of the target directory
		let dirContents = me._getDirContents( absPathToRead );

		// Add target directory contents to return
		_.merge( ret, dirContents );

		// Dive deeper into subdirectories
		_.each( dirContents, function ( item, absPath ) {

			if ( item.isDirectory === true ) {

				me._getDirContentsRecursive( absPath, ret );
			}
		} );

		// Done
		return ret;
	}

	/**
	 * Returns the contents (dirs+files) of a single file system directory.
	 *
	 * @protected
	 * @param {string} absPathToRead - The file system directory to read.
	 * @returns {Object} An object, keyed by absolute path, that contains
	 *     information about each item (dirs+files) found within the provided
	 *     `absPathToRead`.
	 */
	_getDirContents( absPathToRead ) {

		const me = this;

		// Dependencies
		const _		= me.$dep( "lodash" );
		const PATH	= me.$dep( "path" );
		const FS	= me.$dep( "fs" );

		// Init the return object
		let ret = {};

		// Defer to the `fs` module to read the directory
		let res = FS.readdirSync( absPathToRead );

		// Iterate over each item found by the `fs` module
		_.each( res, function ( relItem ) {

			// Resolve the absolute path for the item...
			let absItem = PATH.join( absPathToRead, relItem );

			// Stat the item, which will provide lots
			// of useful information about it (especially
			// info about whether or not it is a file or dir)
			let stat = FS.statSync( absItem );

			// Create the info object for the target item
			let item = {
				path        : absItem,
				name        : relItem,
				isDirectory : stat.isDirectory(),
				stat        : stat,
			};

			// Add the info for the current
			// item to the return object
			ret[ absItem ] = item;
		} );

		// All done
		return ret;
	}

	// --

	/**
	 * A string that is used as the prefix for all event "name" fields within
	 * the {@link Logging.Logger} object.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get loggerPrefix() {

		const me = this;

		return "msa.generator." + me.constructor.name;
	}

	/**
	 * Initializes a new logger object.
	 *
	 * @private
	 * @returns {void} The new logger object will be stored in the 'logger'
	 *     property.
	 */
	_initLogger() {

		const me = this;

		let config	= me._createLoggerConfig( me.loggerConfigOverrides );

		// Instantiate the logger
		me.logger = me.$dep( "logger", config );
	}

	/**
	 * Creates a logger configuration object the is pre-filled with
	 * information about this Generator.
	 *
	 * @access private
	 * @returns {Object} A plain configuration object to be passed to
	 *     the constructor of new Logger objects.
	 */
	_createLoggerConfig() {

		// Locals
		let me = this;

		// Enable debug-level message output if the NODE_DEBUG
		// environment variable is 1 or "true"
		let minLogLevel;

		if( process.env.NODE_DEBUG === undefined ) {

			minLogLevel = 6;

		} else {

			switch ( process.env.NODE_DEBUG.toLowerCase() ) {

				case "1":
				case "true":
					minLogLevel = 7;
					break;

				default:
					minLogLevel = 6;
					break;

			}

		}

		// Setup the initial logger config based on
		// information pulled from the context/environment.
		return {
			application : "core-microservices",
			component  	: me.constructor.name,
			namePrefix  : me.loggerPrefix,
			linear      : true,
			minLogLevel : minLogLevel,
		};
	}

	// <editor-fold desc="--- Paths & Path Management ------------------------">

	/**
	 * @inheritDoc
	 */
	get pathManager() {

		// Locals
		const me = this;

		// Deps
		const PATH = me.$dep( "path" );

		// Defer to parent/super..
		let pm = super.pathManager;

		// Attach the microservices lib path (as needed)
		if ( !pm.hasPath( "microservicesLib" ) ) {

			pm.setPath( "microservicesLib", PATH.join( __dirname, ".." ) );
		}

		// Attach the service paths (as possible & needed)
		if ( me.serviceRootPath !== undefined ) {

			if ( !pm.hasPath( "serviceRoot" ) ) {

				pm.setPath( "serviceRoot", me.serviceRootPath );
			}
			if ( !pm.hasPath( "serviceLib" ) ) {

				pm.setPath( "serviceLib", PATH.join( me.serviceRootPath, "lib" ) );
			}
		}

		// All done..
		return pm;
	}

	/**
	 * @inheritDoc
	 */
	set pathManager( /** Common.PathManager */ val ) {

		// I had to add this setter because I added a getter override.
		// If I had not, then `pathManager` would have been
		// treated as read-only.

		super.pathManager = val;
	}

	// </editor-fold>
}

module.exports = BaseGenerator;
