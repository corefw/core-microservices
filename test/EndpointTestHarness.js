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

const BaseClass	= require( "@corefw/core-common" ).common.BaseClass;
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

	/**
	 * The filename of the file that defines the endpoint class.
	 *
	 * @public
	 * @type {string}
	 */
	get endpointClassFilename() {

		const me = this;

		return me.getConfigValue(
			"endpointClassFilename",
			me._resolveEndpointClassFilename
		);
	}

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
		const path = me.$dep( "path" );

		if (
			me.endpointDirectoryPath === null ||
			me.endpointClassFilename === null
		) {

			return null;
		}

		return path.join( me.endpointDirectoryPath, me.endpointClassFilename );
	}

	/**
	 * The endpoint class definition.
	 *
	 * @public
	 * @type {Object}
	 */
	get endpointClass() {

		const me = this;

		return me.getConfigValue( "endpointClass", me._loadEndpointClass );
	}

	// noinspection JSUnusedGlobalSymbols
	set endpointClass( /** Object */ val ) {

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

		// Inherit some settings from the endpoint
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
	 * @returns {Promise.<Object>} Response data.
	 */
	exec( cfg ) {

		const me = this;

		let endpoint = me.endpoint;

		// Initial config handling...
		cfg = me._initConfigObject( cfg );

		// Get parameters
		let params = me._getParametersFromConfig( cfg, true );

		// Get context
		let context = me._getContextFromConfig( cfg );

		// Execute...
		return endpoint.execute( params, context )
			.then( function ( responseObject ) {

				// Build a composite object
				let responseData = {
					request: {
						parameters 	: params,
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
	 * Executes an endpoint and validates the structure of and, optionally,
	 * the data within the response.
	 *
	 * @param {Object} cfg - Configuration object.
	 * @returns {Promise.<Object>} Response data.
	 */
	execAndValidate( cfg ) {

		const me = this;

		// Initial config handling...
		cfg = me._initConfigObject( cfg );

		// Allow the automatic display of the response
		// to be overridden / disabled.
		let showResponse = me._getConfigPropertyWithDefault(
			cfg, "showResponse", false, true
		);

		// Parse for example data file config
		cfg = me._loadConfigFromFile( cfg );

		// Get comparison data object
		let compare = me._getConfigProperty( cfg, "compare", true );

		// Execute
		return me.exec( cfg ).then( function ( responseData ) {

			// Append the comparisonObject
			responseData.comparisonObject = compare;

			// Display the response body, if desired...
			if ( showResponse ) {

				me.dbg( responseData.response.body, true, 2 );
			}

			// Do validation
			me._validateResponseData( responseData );

			// Resolve
			return responseData;
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
	 * does contain a "callback" property. This method will, also, optionally,
	 * delete the callback property from the object after extracting it.
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
	 * Utility method that will return the "comparison object" (which must be
	 * named, exactly, "compare") from a given object, or NULL if the object
	 * does contain a "compare" property. This method will, also, optionally,
	 * delete the "compare" property from the object after extracting it.
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
	 * @param {?string} [filePath='_basic.json'] - A file path relative to the
	 *     'dataDirectoryPath' property.
	 * @returns {Object} The file contents.
	 */
	_getConfigFileContents( filePath ) {

		const me = this;

		// Dependencies
		const path = me.$dep( "path" );

		// Constants
		const defaultFile = "_basic.json";

		// Default Params
		if ( filePath === undefined || filePath === null ) {

			filePath = defaultFile;
		}

		// Resolve absolute path
		let abs = path.resolve( me.dataDirectoryPath, filePath );

		// Load it and return...
		return require( abs );
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
	 * schemas.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get globalSchemaRoot() {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( __dirname, "../../schemas" );
	}

	/**
	 * An absolute file path to the directory containing all common/global
	 * endpoint schemas.
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
			JsonApiMeta           : me._loadGlobalResponseSchemaDefinition( "JsonApiMeta" ),
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
	 * @returns {void} Errors are thrown if validation fails.
	 */
	_validateResponseData( responseData ) {

		const me = this;

		me._validateResponseWithSchemas( responseData );
	}

	/**
	 * The main entry point for response validation via schema definitions.
	 *
	 * @private
	 * @param {Object} responseData - The response data to validate.
	 * @returns {void} Errors are thrown if validation fails.
	 */
	_validateResponseWithSchemas( responseData ) {

		const me = this;

		let body = responseData.response.body;

		// Validate
		me._validateWithSchema(
			body, me._loadGlobalResponseSchema( "UniversalResponseSchema" )
		);

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
	 * @param {Object} obj - The object to validate.
	 * @param {Object} schema - The schema to use in the validation.
	 * @returns {void} Throws errors if validation fails.
	 */
	_validateWithSchema( obj, schema ) {

		const me = this;

		// Dependencies
		// const ERRORS = me.$dep( "errors" );

		let schemaName = schema.id;

		let validator = me.$spawn( "commonLib", "util/Validator",
			{
				obj        				: obj,
				schema      			: schema,
				throwTv4Errors	: true,
				definitions  		: me.globalDefinitions,
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

			// FIXME: abstract error
			throw new ERRORS.abstract.ResponseValidationError(
				validationErr, "Response failed validation against " +
				"'" + schemaName + "'"
			);
		}

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

		return require( path );
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

		return require( path );
	}

	/**
	 * A utility function for 'global' schema path resolution.
	 *
	 * @private
	 * @param {string} absBasePath - The path of the directory that contains the
	 *     schema.
	 * @param {string} schemaName - The name of the schema (without .json)
	 * @returns {string} An absolute path to the schema.
	 */
	_resolveGlobalSchemaPath( absBasePath, schemaName ) {

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		return PATH.join( absBasePath, schemaName + ".json" );
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
