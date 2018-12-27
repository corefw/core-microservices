/**
 * Defines the EndpointTestHarness class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseClass	= require( "@corefw/common" ).common.BaseClass;
const ERRORS	= require( "../errors" );

/**
 * A class used to test endpoints, their functionality, and validate their
 * returns using universal tests.
 *
 * @memberOf Test
 * @extends Common.BaseClass
 */
class EndpointTestHarness extends BaseClass {

	// <editor-fold desc="--- Basic Harness Properties & Initializers --------">

	_initialize( cfg ) {

		const me = this;

		super._initialize( cfg );

		me.addDependency( "deep-diff", require( "deep-diff" ) );
	}

	/**
	 * The filename of the file that defines the endpoint class.
	 *
	 * @public
	 * @type {string}
	 */
	get endpointClassFilename() {

		const me = this;

		return me.getConfigValue( "endpointClassFilename",	me._resolveEndpointClassFilename );
	}

	/**
	 * Resolves the endpoint class filename.
	 *
	 * @private
	 * @returns {string} The resolved endpoint class filename.
	 */
	_resolveEndpointClassFilename() {

		const me = this;

		let path	= me.endpointDirectoryPath;
		let spl		= path.split( "/" );
		let last	= spl[ spl.length - 1 ];

		return last + ".js";
	}

	// noinspection JSUnusedGlobalSymbols
	set endpointClassFilename( /** string */ val ) {

		const me = this;

		me.setConfigValue( "endpointClassFilename", val );
		me.eraseConfigValue( "endpointClass" );
	}

	/**
	 * An absolute path to the endpoint's root directory.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 */
	get endpointDirectoryPath() {

		const me = this;

		return me.getConfigValue( "endpointDirectoryPath", null );
	}

	// noinspection JSUnusedGlobalSymbols
	set endpointDirectoryPath( /** ?string */ val ) {

		const me = this;

		me.setConfigValue( "endpointDirectoryPath", val );
		me.eraseConfigValue( "endpointClass" );
	}

	/**
	 * An absolute path to the file that defines the endpoint class.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get endpointClassPath() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		if (
			me.endpointDirectoryPath === null ||
			me.endpointClassFilename === null
		) {

			return null;
		}

		return PATH.join( me.endpointDirectoryPath, me.endpointClassFilename );
	}

	/**
	 * The endpoint class definition.
	 *
	 * @public
	 * @type {Endpoint.BaseEndpoint}
	 */
	get endpointClass() {

		const me = this;

		return me.getConfigValue( "endpointClass", me._loadEndpointClass );
	}

	// noinspection JSUnusedGlobalSymbols
	set endpointClass( /** Endpoint.BaseEndpoint */ val ) {

		const me = this;

		me.setConfigValue( "endpointClass", val );
	}

	/**
	 * The current test mode (e.g. "local", "remote", etc), which determines
	 * how the target endpoint will be invoked.
	 *
	 * @public
	 * @type {string}
	 * @default "local"
	 */
	get testMode() {

		const me = this;

		return me.getConfigValue( "testMode", "local" );
	}

	// noinspection JSUnusedGlobalSymbols
	set testMode( /** string */ val ) {

		const me = this;

		me.setConfigValue( "testMode", val );
	}

	/**
	 * An absolute path to the test data files that will be used to test
	 * the endpoint.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 */
	get dataDirectoryPath() {

		const me = this;

		return me.getConfigValue( "dataDirectoryPath", null );
	}

	// noinspection JSUnusedGlobalSymbols
	set dataDirectoryPath( /** ?string */ val ) {

		const me = this;

		me.setConfigValue( "dataDirectoryPath", val );
	}

	/**
	 * Loads the endpoint class definition for local testing.
	 *
	 * @private
	 * @returns {Object} The endpoint class definition.
	 */
	_loadEndpointClass() {

		const me = this;

		return require( me.endpointClassPath );
	}

	// </editor-fold>

	// <editor-fold desc="--- Endpoint Object Instantiation ------------------">

	/**
	 * The endpoint to be tested.
	 *
	 * @public
	 * @type {?Endpoint.BaseEndpoint}
	 * @readonly
	 */
	get endpoint() {

		const me = this;

		switch ( me.testMode.toLowerCase() ) {

			case "local":

				return me._initLocalEndpoint();

			default:

				return null;
		}
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * The endpoint to be tested within the 'local' `mode`.
	 *
	 * @public
	 * @type {Endpoint.BaseEndpoint}
	 * @readonly
	 */
	get localEndpoint() {

		const me = this;

		return me._initLocalEndpoint();
	}

	/**
	 * Loads and instantiates an endpoint for local testing.
	 *
	 * @private
	 * @param {?Object} [cfg=null] - An optional configuration object to pass to
	 *     the endpoint's constructor during instantiation.
	 * @returns {Endpoint.BaseEndpoint} The instantiated endpoint.
	 */
	_initLocalEndpoint( cfg ) {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Default params
		if ( TIPE( cfg ) !== "object" ) {

			cfg = {};
		}

		// Force environment name
		if ( process.env.TRAVIS_JOB_NUMBER !== undefined ) {

			cfg.environment = "MochaCi";

		} else {

			cfg.environment = "MochaDevelopment";
		}

		let EndpointClass = me.endpointClass;

		// Instantiate the endpoint
		let ep = new EndpointClass( cfg );

		// Inherit some settings from the endpoint test harness
		ep.$adopt( me );

		// Return it.
		return ep;
	}

	// </editor-fold>

	// <editor-fold desc="--- Endpoint Execution Wrappers --------------------">

	/**
	 * Instantiates an endpoint object and executes it.
	 *
	 * @param {Object} cfg - Configuration object.
	 * @returns {Promise<Object>} Response data.
	 */
	exec( cfg ) {

		const me = this;

		let endpoint = me.endpoint;

		// Initial config handling...
		cfg = me._initConfigObject( cfg );

		// Get parameters
		let parameters = me._getParametersFromConfig( cfg, true );

		// Get request body
		let requestBody = me._getRequestBodyFromConfig( cfg, true );

		let event = {
			parameters : parameters,
			body       : requestBody,
		};

		// Get context
		let context = me._getContextFromConfig( cfg );

		// Execute...
		return endpoint.execute( event, context )
			.then( function ( responseObject ) {

				// Build a composite object
				let responseData = {
					request: {
						parameters 	: parameters,
						contextData	: context,
					},
					response : responseObject,
					endpoint : endpoint,
				};

				// Store the response in history.
				me.responses.push( responseData );

				// Return the composite data
				return responseData;
			} );
	}

	/**
	 * Run a specific enabled endpoint test.
	 *
	 * @param {Object} cfg - Test configuration.
	 * @returns {void}
	 */
	runTest( cfg ) {

		const me = this;

		let endpointClassFilename = me.endpointClassFilename;
		let endpointDirectoryPath = me.endpointDirectoryPath;

		// FIXME: better way to resolve this?
		endpointDirectoryPath = endpointDirectoryPath.split( "lib/endpoints" )[ 1 ];

		describe.only( "Endpoint Class File: " + endpointDirectoryPath + "/" + endpointClassFilename, function () {

			it( "Should pass test...", function () {

				return me.execAndValidate( cfg );
			} );
		} );
	}

	/**
	 * Runs all available and enabled endpoint tests.
	 *
	 * @returns {void}
	 */
	runTests() {

		const me = this;

		// Dependencies
		const _		= me.$dep( "lodash" );
		const fs	= me.$dep( "fs" );

		let dataDir					= me.dataDirectoryPath;
		let endpointClassFilename	= me.endpointClassFilename;
		let endpointDirectoryPath	= me.endpointDirectoryPath;

		// FIXME: better way to resolve this?
		endpointDirectoryPath = endpointDirectoryPath.split( "lib/endpoints" )[ 1 ];

		let files = fs.readdirSync( dataDir );

		describe.only( "Endpoint Class File: " + endpointDirectoryPath + "/" + endpointClassFilename, function () {

			_.each( files, function ( file ) {

				it( "Test Data File: " + file, function () {

					return me.execAndValidate( {
						file: file,
						// showResponse : false,
						// loggerConfig : {
						// 	minLogLevel: 0, 	// <- set to 7 to see logs
						// },
					} );
				} );
			} );
		} );
	}

	/**
	 * Executes an endpoint and validates the structure of and, optionally,
	 * the data within the response.
	 *
	 * @param {Object} cfg - Configuration object.
	 * @returns {Promise<Object>} Response data.
	 */
	execAndValidate( cfg ) {

		const me = this;

		const BB = me.$dep( "bluebird" );

		// Initial config handling...
		cfg = me._initConfigObject( cfg );

		// Parse for example data file config
		cfg = me._loadConfigFromFile( cfg );

		let enabled = me._getConfigPropertyWithDefault(
			cfg, "enabled", true, true
		);

		if ( !enabled ) {

			me.dbg( "This test is not enabled, skipping.", true, 2 );

			return BB.resolve();
		}

		// Allow the automatic display of the response
		// to be overridden / disabled.
		let showResponse = me._getConfigPropertyWithDefault(
			cfg, "showResponse", false, true
		);

		// Get comparison data object
		let compare = me._getComparisonObjectFromConfig( cfg, true );

		// Execute
		return me.exec( cfg ).then( function ( responseData ) {

			// Append the comparisonObject
			responseData.comparisonObject = compare;

			// Display the response body, if desired...
			if ( showResponse ) {

				me.dbg( responseData.response.body, true, 2 );
			}

			// Resolve
			return responseData;

		} ).then( function ( responseData ) {

			// Do validation
			return me._validateResponseData( responseData ).then( function () {

				// Resolve
				return responseData;
			} );
		} );
	}

	// </editor-fold>

	// <editor-fold desc="--- Execution Config: Basic Processing -------------">

	/**
	 * Ensures that a configuration object is, actually, an object.
	 *
	 * @private
	 * @param {Object} cfg - The configuration object
	 * @returns {Object} Either the configuration object that was passed in or
	 *     a new object if the passed config was not an object.
	 */
	_initConfigObject( cfg ) {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Ensure it's an object
		if ( TIPE( cfg ) !== "object" ) {

			cfg = {};
		}

		// Normalize
		if ( cfg.params !== undefined && cfg.parameters === undefined ) {

			cfg.parameters = cfg.params;
		}

		delete cfg.params;

		// Done
		return cfg;
	}

	/**
	 * Utility method that will return the callback function (which must be
	 * named, exactly, "callback") from a given object, or NULL if the object
	 * does not contain a "callback" property. This method will, also,
	 * optionally, delete the callback property from the object after extracting
	 * it.
	 *
	 * @private
	 * @param {Object} cfg - The configuration object.
	 * @param {boolean} [createDummyCallback=true] - When TRUE, a dummy function
	 *     will be returned if the configuration object does not have a
	 *     "callback" property. If FALSE, then NULL will be returned in that
	 *     case.
	 * @param {boolean} [removeFromObject=true] - When TRUE, the "callback"
	 *     property will be removed from the configuration object after its
	 *     value has been extracted.
	 * @returns {?function} A callback function or NULL.
	 */
	_getCallbackFromConfig( cfg, createDummyCallback, removeFromObject ) {

		const me = this;

		// Get current value
		let defaultValue = null;

		// Param defaults
		if ( createDummyCallback !== false ) {

			createDummyCallback = true;
		}

		if ( removeFromObject !== false ) {

			removeFromObject = true;
		}

		// Create dummy function
		if ( createDummyCallback ) {

			defaultValue = function dummyCallback() {

				// Does Nothing
			};
		}

		// Check for the callback
		return me._getConfigPropertyWithDefault(
			cfg, "callback", defaultValue, removeFromObject
		);
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Returns a 'context data' object from a provided config object.
	 * For now, this method just returns the whole configuration object
	 * back, under the assumption that everything within it is context data.
	 *
	 * @private
	 * @param {Object} cfg - Configuration object.
	 * @returns {Object} Context data.
	 */
	_getContextFromConfig( cfg ) {

		return cfg;
	}

	/**
	 * Extracts the parameter data from a configuration object.

	 * @private
	 * @param {Object} cfg - Configuration object.
	 * @param {boolean} [removeFromObject=false] - When TRUE, the property will
	 *     be removed from the object after the value has been extracted.
	 * @returns {*} The property value or NULL if the property does not exist
	 *     or if it was already NULL.
	 */
	_getParametersFromConfig( cfg, removeFromObject ) {

		const me = this;

		// Param defaults
		if ( removeFromObject !== false ) {

			removeFromObject = true;
		}

		// Get the value
		return me._getConfigProperty( cfg, "parameters", removeFromObject );
	}

	/**
	 * Extracts the request body data from a configuration object.

	 * @private
	 * @param {Object} cfg - Configuration object.
	 * @param {boolean} [removeFromObject=false] - When TRUE, the property will
	 *     be removed from the object after the value has been extracted.
	 * @returns {*} The property value or NULL if the property does not exist
	 *     or if it was already NULL.
	 */
	_getRequestBodyFromConfig( cfg, removeFromObject ) {

		const me = this;

		// Param defaults
		if ( removeFromObject !== false ) {

			removeFromObject = true;
		}

		// Get the value
		return me._getConfigProperty( cfg, "requestBody", removeFromObject );
	}

	/**
	 * Utility method that will return the "comparison object" (which must be
	 * named, exactly, "compare") from a given object, or NULL if the object
	 * does not contain a "compare" property. This method will, also,
	 * optionally, delete the "compare" property from the object after
	 * extracting it.
	 *
	 * @private
	 * @param {Object} cfg - The configuration object.
	 * @param {boolean} [removeFromObject=true] - When TRUE, the "compare"
	 *     property will be removed from the configuration object after its
	 *     value has been extracted.
	 * @returns {?Object} A comparison object, or NULL.
	 */
	_getComparisonObjectFromConfig( cfg, removeFromObject ) {

		const me = this;

		// Param defaults
		if ( removeFromObject !== false ) {

			removeFromObject = true;
		}

		// Get the value, with a default...
		return me._getConfigProperty( cfg, "compare", removeFromObject );
	}

	/**
	 * Utility method that will return a property from a given object, or
	 * NULL if the object does not have that property. This method will,
	 * also, optionally, delete the property from the object after extracting
	 * its value.
	 *
	 * @private
	 * @param {Object} obj - The object to pull the property from.
	 * @param {string} propertyName - The name of the property to extract.
	 * @param {boolean} [removeFromObject=false] - When TRUE, the property will
	 *     be removed from the object after the value has been extracted.
	 * @returns {*} The property value or NULL if the property does not exist
	 *     or if it was already NULL.
	 */
	_getConfigProperty( obj, propertyName, removeFromObject ) {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		let val;

		// Default params
		if ( removeFromObject !== true ) {

			removeFromObject = false;
		}

		// We can exit early if 'obj' is not an object
		if ( TIPE( obj ) !== "object" ) {

			return null;
		}

		// Check for the value
		if (
			TIPE( obj[ propertyName ] ) === "undefined" ||
			obj[ propertyName ] === null
		) {

			val = null;

		} else {

			val = obj[ propertyName ];
		}

		// Remove if necessary
		if ( removeFromObject ) {

			delete obj[ propertyName ];
		}

		// Done
		return val;
	}

	/**
	 * Utility method that will return a property from a given object, or
	 * a default value if the object does not have that property. This method
	 * will, also, optionally, delete the property from the object after
	 * extracting its value.
	 *
	 * @private
	 * @param {Object} obj - The object to pull the property from.
	 * @param {string} propertyName - The name of the property to extract.
	 * @param {*} defaultValue - The value to return if the property is not
	 *     found or if it is NULL.
	 * @param {boolean} [removeFromObject=false] - When TRUE, the property will
	 *     be removed from the object after the value has been extracted.
	 * @returns {*} The property value or NULL if the property does not exist
	 *     or if it was already NULL.
	 */
	_getConfigPropertyWithDefault(
		obj,
		propertyName,
		defaultValue,
		removeFromObject
	) {

		const me = this;

		// Capture value
		let val = me._getConfigProperty( obj, propertyName, removeFromObject );

		// Return or default
		if ( val === null ) {

			return defaultValue;
		}

		return val;
	}

	// </editor-fold>

	// <editor-fold desc="--- Execution Config: File Loading -----------------">

	/**
	 * Checks a provided config object for 'parameters' and 'file' properties,
	 * decides if a config file should be loaded, and then, if so, loads the
	 * config file and merges it with the config object (giving precedence to
	 * settings in the config object).
	 *
	 * @private
	 * @param {Object} cfg - A configuration object.
	 * @returns {Object} A new configuration object, potentially with new
	 *     data that was merged in from a config file.
	 */
	_loadConfigFromFile( cfg ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let fileContents;

		// Get relevant properties from the config
		let file 	= me._getConfigProperty( cfg, "file", true );
		let params 	= me._getParametersFromConfig( cfg, false );

		// Decide if we should load a file...
		if ( params === null || file !== null ) {

			fileContents = me._getConfigFileContents( file );
		}

		// Merge file contents onto the config
		cfg = _.merge( {}, fileContents, cfg );

		// Return the new config
		return cfg;
	}

	/**
	 * Loads a config file when given a path relative to the
	 * 'dataDirectoryPath' property.
	 *
	 * @private
	 * @param {?string} [filePath='_basic.yml'] - A file path relative to the
	 *     'dataDirectoryPath' property.
	 * @returns {Object} The file contents.
	 */
	_getConfigFileContents( filePath ) {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		// Constants
		const defaultFile = "_basic.yml";

		// Default Params
		if ( filePath === undefined || filePath === null ) {

			filePath = defaultFile;
		}

		// Resolve absolute path
		let abs = PATH.resolve( me.dataDirectoryPath, filePath );

		me.dbg( "Loading test data file: " + filePath, true, 2 );

		// Load it and return...
		return me._loadYamlFile( abs );
	}

	// </editor-fold>

	// <editor-fold desc="--- Responses & History ----------------------------">

	/**
	 * Stores all endpoint responses; this allows responses to be tested
	 * using multiple tests without needing to re-execute the endpoint/query.
	 *
	 * @public
	 * @type {Array}
	 * @default []
	 */
	get responses() {

		const me = this;

		return me.getConfigValue( "responses", [] );
	}

	set responses( /** Array */ val ) {

		const me = this;

		me.setConfigValue( "responses", val );
	}

	/**
	 * The endpoint response from the last endpoint execution.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get lastResponse() {

		const me = this;

		let r = me.responses;

		if ( r === null ) {

			return null;

		} else if ( r.length === 0 ) {

			return null;
		}

		return r[ r.length - 1 ];
	}

	// </editor-fold>

	// <editor-fold desc="--- Response Validation ----------------------------">

	// -- Properties --

	/**
	 * An absolute file path to the root directory for all common/global
	 * schema.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get globalSchemaRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( __dirname, "../../schema" );
	}

	/**
	 * An absolute file path to the directory containing all common/global
	 * endpoint validation schemas.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get globalValidationSchemaRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.globalSchemaRoot, "validation" );
	}

	/**
	 * An absolute file path to the directory containing all common/global
	 * endpoint response schemas.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get globalResponseSchemaRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.globalValidationSchemaRoot, "response" );
	}

	/**
	 * An absolute file path to the directory containing all common/global
	 * endpoint schemas that are related to feature mixins.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get globalFeatureSchemaRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.globalResponseSchemaRoot, "features" );
	}

	/**
	 * An absolute file path to the directory containing all common/global
	 * schema 'definitions' (refs/reference).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get globalSchemaDefinitionRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( me.globalResponseSchemaRoot, "definitions" );
	}

	/**
	 * All common/global 'definitions' (refs/references), as a plain object.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get globalDefinitions() {

		const me = this;

		return {
			JsonApi               : me._loadGlobalResponseSchemaDefinition( "JsonApi" ),
			UniversalResponseMeta : me._loadGlobalResponseSchemaDefinition( "UniversalResponseMeta" ),
			UuidField             : me._loadGlobalResponseSchemaDefinition( "UuidField" ),
		};
	}

	// -- the main methods --

	/**
	 * The main entry point for response validation.
	 *
	 * @private
	 * @param {Object} responseData - The response data to validate.
	 * @returns {Promise<void>} Errors are thrown if validation fails.
	 */
	_validateResponseData( responseData ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			return me._validateResponseWithSchemas( responseData );

		} ).then( function () {

			return me._validateResponseWithComparisonObject( responseData );
		} );
	}

	/**
	 * Validates the response against included comparision object.
	 *
	 * @private
	 * @throws ResponseValidationError
	 * @param {Object} responseData - The response data to validate.
	 * @returns {Promise<void>} Errors are thrown if validation fails.
	 */
	_validateResponseWithComparisonObject( responseData ) {

		const me = this;

		// Dependencies
		const diff	= me.$dep( "deep-diff" ).diff;
		const util	= me.$dep( "util" );
		const BB	= me.$dep( "bluebird" );
		const _		= me.$dep( "lodash" );

		return BB.try( function () {

			let comparisonObject = responseData.comparisonObject;
			let changes = null;

			if ( comparisonObject ) {

				// Compare data...

				if ( comparisonObject.data ) {

					changes = diff(
						responseData.comparisonObject.data,
						responseData.response.body.data,
						function ( path, key ) {

							// ignore certain inconsequential properties that
							// are likely to change

							let fullPath	= "/" + path.join( "/" ) + "/" + key;
							let skip		= false;

							let ignorePaths = [
								/\/meta\/createdDateTime$/,
								/\/meta\/updatedDateTime$/,
								/\/relationships\/createdBy\/id$/,
								/\/relationships\/updatedBy\/id$/,
							];

							_.each( ignorePaths, function ( ignorePath ) {

								if ( ignorePath.test( fullPath ) ) {

									skip = true;
								}

								return !skip;
							} );

							return skip;
						}
					);

					if ( changes ) {

						throw new ERRORS.ResponseValidationError(
							"Response failed validation against comparison object!\n" +
							"Consult deep-diff documentation to interpret results: https://www.npmjs.com/package/deep-diff\n" +
							"\n" +
							"DeepDiff Result:\n" +
							"\n" +
							util.inspect( changes, false, null )
						);
					}
				}

				// Compare errors...

				if ( comparisonObject.errors ) {

					changes = diff(
						responseData.comparisonObject.errors,
						responseData.response.body.errors
					);

					if ( changes ) {

						throw new ERRORS.ResponseValidationError(
							"Response failed validation against comparison object!\n" +
							"Consult deep-diff documentation to interpret results: https://www.npmjs.com/package/deep-diff\n" +
							"\n" +
							"DeepDiff Result:\n" +
							"\n" +
							util.inspect( changes, false, null )
						);
					}
				}
			}
		} );
	}

	/**
	 * The main entry point for response validation via schema definitions.
	 *
	 * @private
	 * @param {Object} responseData - The response data to validate.
	 * @returns {Promise<void>} Errors are thrown if validation fails.
	 */
	_validateResponseWithSchemas( responseData ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		let body = responseData.response.body;

		return BB.try( function () {

			return me._loadGlobalResponseSchema( "UniversalResponseSchema" );

		} ).then( function ( schema ) {

			return me._validateWithSchema( body, schema );

		} ).then( function () {

			return me.endpoint.getResponseSchema();

		} ).then( function ( schema ) {

			return me._validateWithSchema( body, schema );
		} );

		// Validate

		// todo: add more schemas
		//   - ErrorResponseSchema
		//   - SuccessResponseSchema
		//   - GetManyResponseSchema
		//   - features/PaginationResponseSchema
	}

	/**
	 * Validates an object using a schema.
	 *
	 * @private
	 * @throws ResponseValidationError
	 * @param {Object} data - The object to validate.
	 * @param {Object} schema - The schema to use in the validation.
	 * @returns {Promise<void>} Throws errors if validation fails.
	 */
	_validateWithSchema( data, schema ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			let schemaName = schema.id;

			let validator = me.$spawn( "commonLib", "util/Validator",
				{
					data           : data,
					schema         : schema,
					throwTv4Errors : true,
					definitions    : me.globalDefinitions,
				}
			);

			// Do the validation.
			try {

				validator.validate();

			} catch ( validationErr ) {

				// Make an error that we can understand...
				if ( validationErr.dataPath !== undefined ) {

					validationErr.message =
						validationErr.message +
						" (at 'response" +
						validationErr.dataPath.replace( /\//g, "." ) + "')";
				}

				throw new ERRORS.ResponseValidationError(
					validationErr, "Response failed validation against " +
					"'" + schemaName + "'"
				);
			}
		} );

		/*
		Another way of loading the validator...
		...keeping this for debugging, for now.

		let v = require("../util/Validator");
		let validator = new v({
			obj				: obj,
			schema			: schema,
			throwTv4Errors	: true,
			definitions		: me.globalDefinitions
		});
		*/
	}

	// -- utils --

	/**
	 * Loads a common/global response schema.
	 *
	 * @private
	 * @param {string} name - The name of the schema to load.
	 * @returns {Object} The schema object.
	 */
	_loadGlobalResponseSchema( name ) {

		const me = this;

		let path = me._resolveGlobalSchemaPath(
			me.globalResponseSchemaRoot, name
		);

		return me._loadYamlFile( path );
	}

	/**
	 * Loads a common/global response schema definition (ref/reference).
	 *
	 * @private
	 * @param {string} name - The name of the schema definition to load.
	 * @returns {Object} The schema definition object.
	 */
	_loadGlobalResponseSchemaDefinition( name ) {

		const me = this;

		let path = me._resolveGlobalSchemaPath(
			me.globalSchemaDefinitionRoot, name
		);

		return me._loadYamlFile( path );
	}

	/**
	 * A utility function for 'global' schema path resolution.
	 *
	 * @private
	 * @param {string} absBasePath - The path of the directory that contains the
	 *     schema.
	 * @param {string} schemaName - The name of the schema (without .yml)
	 * @returns {string} An absolute path to the schema.
	 */
	_resolveGlobalSchemaPath( absBasePath, schemaName ) {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( absBasePath, schemaName + ".yml" );
	}

	/**
	 * Reads the contents of a YAML file and returns it as an object.
	 *
	 * @protected
	 * @param {string} absPath - The absolute path of the file to read
	 * @param {?string} [property=null] - When provided, and not null, this
	 *     method will return the value of a property from within the loaded
	 *     YAML file. If not provided, or NULL, then the root object will be
	 *     returned.
	 * @returns {Object} The file contents.
	 */
	_loadYamlFile( absPath, property ) {

		const me = this;

		// Dependencies
		const YAML	= me.$dep( "js-yaml" );
		const FS	= me.$dep( "fs" );

		const data = YAML.safeLoad( FS.readFileSync( absPath, "utf8" ) );

		if ( property === undefined || property === null ) {

			return data;
		}

		return data[ property ];
	}

	// </editor-fold>

	// <editor-fold desc="--- Debugging --------------------------------------">

	get debugHelper() {

		const me = this;

		if ( me._debugHelper === undefined || me._debugHelper === null ) {

			me._debugHelper = me.$spawn( "commonLib", "util/DebugHelper" );
		}

		return me._debugHelper;
	}

	/**
	 * A debugging method that dumps the contents of a variable.
	 * This is a convenience alias for `DebugHelper#dbg()`.
	 *
	 * @param {*} varToInspect - The variable to dump.
	 * @param {boolean} [output=true] - Whether or not the contents of the
	 *     variable should be dumped to the console (stdout); if FALSE, the
	 *     output string will be returned, rather than output.
	 * @param {?number} [indent=0] - An optional amount to indent the output,
	 *     using tabs.
	 * @returns {string} The contents ot `varToInspect`
	 */
	dbg( varToInspect, output, indent ) {

		const me = this;

		me.debugHelper.dbg( varToInspect, output, indent );
	}

	// </editor-fold>
}

module.exports = EndpointTestHarness;
