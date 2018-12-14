/**
 * @file Defines the BaseEndpoint class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseClass			= require( "@corefw/common" ).common.BaseClass;
const requireFromString	= require( "require-from-string" );
const ERRORS			= require( "../errors" );

/**
 * The parent class for all endpoints.
 *
 * @memberOf Endpoint
 * @extends Common.BaseClass
 */
class BaseEndpoint extends BaseClass {

	// <editor-fold desc="--- Construction & Initialization ------------------">

	/**
	 * @inheritDoc
	 */
	_initialize( cfg ) {

		const me = this;

		// Call parent
		super._initialize( cfg );

		// If a model object was passed in the
		// config, we'll need to "adopt" it.
		if ( cfg.model !== undefined ) {

			me.$adopt( cfg.model );
		}
	}

	/**
	 * Initialize KmsCrypt configuration.
	 *
	 * @private
	 * @returns {Promise.<void>} Void.
	 */
	_initKmsCryptConfig() {

		const me = this;

		// Dependencies
		const BB		= me.$dep( "bluebird" );
		const _			= me.$dep( "lodash" );
		const KmsCrypt	= me.$dep( "util/kms-crypt" );

		let timerStart;
		let timerStop;

		// The configuration has already been applied, exit early.

		if ( process.env.KMS_CRYPT_CONFIG_APPLIED ) {

			me.$log(
				"info",
				"kms.crypt.config",
				"KMS Crypt Config already applied to environment, skipping."
			);

			return BB.resolve();
		}

		return BB.try( function () {

			me.$log(
				"info",
				"kms.crypt.config",
				"Decrypting KMS Crypt Config from S3."
			);

			let kmsCryptConfig = me.getConfigValue( "kmsCrypt" );

			// FIXME: Logger not available yet. Look into queuing timers?
			timerStart = new Date().getTime();
			// me.logger.timingStart( "kms.crypt.config.decrypt.from.s3" );

			return KmsCrypt.decryptFromS3( kmsCryptConfig );

		} ).then( function ( data ) {

			let config = requireFromString( data );

			// Apply environment variables.

			if ( config.env ) {

				_.assign( process.env, config.env );
			}

			// Mark as applied.

			process.env.KMS_CRYPT_CONFIG_APPLIED = true;

			// FIXME: Logger not available yet. Look into queuing timers?
			timerStop = new Date().getTime();
			// me.logger.timingStop( "kms.crypt.config.decrypt.from.s3" );

			me.$log(
				"info",
				"kms.crypt.config.timing",
				"Elapsed: " + ( timerStop - timerStart )
			);
		} );
	}

	// </editor-fold>

	// <editor-fold desc="--- Fundamental Endpoint Properties ----------------">

	/**
	 * A shortened string representation of the fundamental endpoint "type".
	 * The value for this property is usually provided as a static string
	 * from within the constructors of child classes.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 */
	get endpointType() {

		const me = this;

		return me.getConfigValue( "endpointType", null );
	}

	// noinspection JSUnusedGlobalSymbols
	set endpointType( /** ?string */ val ) {

		const me = this;

		me.setConfigValue( "endpointType", val );
	}

	/**
	 * The name of the default {@link Response.BaseResponse} class to use.
	 * The value for this property is usually provided as a static string
	 * from within the constructors of child classes.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get defaultSuccessResponse() {

		const me = this;

		return me.getConfigValue( "defaultSuccessResponse", null );
	}

	// </editor-fold>

	// <editor-fold desc="--- Fundamental Paths & Path Management ------------">

	/**
	 * An absolute filesystem path to the endpoint's directory.
	 *
	 * @throws {Errors.SourcePathNotDefinedError} If the value for this property
	 *     is requested but not defined (NULL).
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get endpointPath() {

		const me = this;

		let val	= me.getConfigValue( "endpointPath", null );

		if ( val === null ) {

			throw new ERRORS.SourcePathNotDefinedError(
				"Endpoints MUST define their 'Endpoint Root Path' using the " +
				"'endpointPath' configuration property during construction."
			);
		}

		return val;
	}

	/**
	 * An absolute filesystem path to the file that defines the endpoint class.
	 *
	 * @throws {Errors.SourcePathNotDefinedError} If the value for this property
	 *     is requested but not defined (NULL).
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get handlerPath() {

		const me = this;

		let val	= me.getConfigValue( "handlerPath", null );

		if ( val === null ) {

			throw new ERRORS.SourcePathNotDefinedError(
				"Endpoints MUST define their 'Endpoint Handler Path' using " +
				"the 'handlerPath' configuration property during construction."
			);
		}

		return val;
	}

	/**
	 * An absolute filesystem path to the root directory of the project
	 * containing the endpoint (the service repository).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get projectPath() {

		const me = this;

		return me.getConfigValue( "projectPath", me._resolveProjectPath );
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Initializes a PathManager object and attaches it to this endpoint.
	 * PathManagers are used throughout the project by most classes, but they're
	 * usually inherited. Endpoints are the actual creators/source for path
	 * managers, and, so, they need to create their own.
	 *
	 * @private
	 * @returns {Common.PathManager} The path manager is instantiated and then
	 *     stored in the 'pathManager' property.
	 */
	initPathManager() {

		const me = this;

		// Dependencies...
		const PATH = me.$dep( "path" );

		let pm = me.getConfigValue( "pathManager" );

		if ( !pm ) {

			pm = super.initPathManager();
		}

		if ( !pm.hasPath( "microservicesLib" ) ) {

			pm.setPath( "microservicesLib", PATH.join( __dirname, ".." ) );
		}

		// // Dependencies...
		// const PATH = me.$dep( "path" );
		//
		// // We'll only ever need one...
		// if ( me.hasConfigValue( "pathManager" ) ) {
		//
		// 	return me.pathManager;
		// }
		//
		// // Instantiate the new path manager
		// let pm = super.initPathManager();

		// pm.setPath( "microservicesLib", PATH.join( __dirname, ".." ) );

		// Add the core/fundamental paths...
		pm.setPath( "project", 			me.projectPath 		);
		pm.setPath( "endpoint", 		me.endpointPath 	);
		pm.setPath( "endpointHandler", 	me.handlerPath 		);

		// Add the sub-paths
		pm.setSubPath(
			"endpointSchema",
			"endpoint",
			"schema"
		);

		pm.setSubPath(
			"endpoints",
			"project",
			"endpoints"
		);

		pm.setSubPath(
			"projectLib",
			"project",
			"lib"
		);

		pm.setSubPath(
			"models",
			"projectLib",
			"models"
		);

		// Schemas
		pm.setSubPath(
			"parameterSchema",
			"endpointSchema",
			"Parameters.yml"
		);
		pm.setSubPath(
			"requestBodySchema",
			"endpointSchema",
			"RequestBody.yml"
		);
		pm.setSubPath(
			"pathSchema",
			"endpointSchema",
			"Paths.yml"
		);

		pm.setSubPath(
			"responseExample",
			"endpointSchema",
			"SuccessExample.yml"
		);

		pm.setSubPath(
			"responseSchema",
			"endpointSchema",
			"SuccessResponse.yml"
		);

		return pm;
	}

	/**
	 * Resolves the root path for the project that defines the endpoint by
	 * assuming that all endpoints are defined within a root directory named
	 * 'endpoints'.
	 *
	 * @private
	 * @returns {string} An absolute filesystem path.
	 */
	_resolveProjectPath() {

		const me = this;

		let pathSpl	= me.endpointPath.split( "lib/endpoints" );

		return pathSpl[ 0 ];
	}

	// </editor-fold>

	// <editor-fold desc="--- Request, Response, and Parameter Schemas -------">

	// -- parameter schema --

	/**
	 * The absolute path to the parameter schema for this endpoint, which is
	 * used for validation within certain contexts.
	 *
	 * @public
	 * @throws {Errors.MissingParameterSchemaError} If the path to the response
	 *     schema is requested but not defined.
	 * @type {string}
	 * @readonly
	 */
	get parameterSchemaPath() {

		const me = this;

		if ( !me.pathManager.hasPath( "parameterSchema" ) ) {

			throw new ERRORS.MissingParameterSchemaError(
				"All endpoints MUST have a 'Parameter Schema Path' defined."
			);
		}

		return me.pathManager.getPath( "parameterSchema" );
	}

	/**
	 * The absolute path to the request body schema for this endpoint, which is
	 * used for validation within certain contexts.
	 *
	 * @public
	 * @throws {Errors.MissingRequestBodySchemaError} If the path to the
	 *     response schema is requested but not defined.
	 * @type {string}
	 * @readonly
	 */
	get requestBodySchemaPath() {

		const me = this;

		if ( !me.pathManager.hasPath( "requestBodySchema" ) ) {

			throw new ERRORS.MissingRequestBodySchemaError(
				"All endpoints MUST have a 'Request Body Schema Path' defined."
			);
		}

		return me.pathManager.getPath( "requestBodySchema" );
	}

	/**
	 * Get a schema representing the parameters within a valid request, in JSON
	 * Schema object format.
	 *
	 * @public
	 * @throws {Errors.MissingParameterSchemaError} If the schema is requested
	 *     but is not defined.
	 * @returns {Promise.<Object>} Parameter schema.
	 */
	getParameterSchema() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		if ( me.hasConfigValue( "parameterSchema" ) ) {

			return BB.resolve(
				me.getConfigValue( "parameterSchema" )
			);
		}

		return me._loadParameterSchema()
			.then( function ( parameterSchema ) {

				me.setConfigValue( "parameterSchema", parameterSchema );

				return parameterSchema;
			} );
	}

	/**
	 * Get a schema representing the request body within a valid request, in
	 * JSON Schema object format.
	 *
	 * @public
	 * @throws {Errors.MissingRequestBodySchemaError} If the schema is requested
	 *     but is not defined.
	 * @returns {Promise.<Object>} Parameter schema.
	 */
	getRequestBodySchema() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.resolve( null );
	}

	/**
	 * Set a schema representing the parameters within a valid request, in JSON
	 * Schema object format.
	 *
	 * @public
	 * @param {Object} parameterSchema - Parameter schema.
	 * @returns {void}
	 */
	setParameterSchema( parameterSchema ) {

		const me = this;

		me.setConfigValue( "parameterSchema", parameterSchema );
	}

	/**
	 * Loads the parameter schema (from a file) using the `parameterSchemaPath`.
	 *
	 * @private
	 * @throws {Errors.MissingParameterSchemaError} If the schema could not be
	 *     loaded (for any reason).
	 * @returns {Promise.<Object>} The loaded parameter schema.
	 */
	_loadParameterSchema() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			let projectPath		= me.projectPath;
			let SchemaGenerator	= require( "../util/SchemaGenerator" );

			let schemaGenerator = new SchemaGenerator( {
				serviceRootPath: projectPath,
			} );

			return schemaGenerator.buildSchema( me.parameterSchemaPath );

		} ).catch( function ( err ) {

			throw new ERRORS.MissingParameterSchemaError(
				err,
				"Failed to load the parameter schema."
			);
		} );
	}

	// -- request schema --

	/**
	 * Creates a request schema by parsing and evaluating the endpoint's
	 * parameter schema.
	 *
	 * Note: Originally we had a tangible request schema, but after considering
	 * it, it seemed rather redundant since it mostly just reiterated the
	 * endpoint's parameter schema (which is used, directly, in service-level
	 * OpenAPI specs). So, I refactored the code to build the request schema
	 * dynamically, using the parameter schema, in order to get past some
	 * code that depends on a request schema. This may be temporary, and we
	 * may need to go back to having a full request schema... but, this should
	 * work for now.
	 *
	 * -- Luke, 11/14/17
	 *
	 * @private
	 * @returns {Promise.<Object>} The created request schema.
	 */
	_createRequestSchema() {

		const me = this;

		// Dependencies
		const BB	= me.$dep( "bluebird" );
		const _		= me.$dep( "lodash" );

		return BB.try( function () {

			return BB.all( [
				me.getParameterSchema(),
				me.getRequestBodySchema(),
			] );

		} ).then( function ( [ parameterSchema, requestBodySchema ] )	{

			// Init return
			let requestSchema = {
				"$id"         : "#" + me.operationId + "Request",
				"type"        : "object",
				"description" : "A request for the " + me.operationId +
					" endpoint/operation.",
				"properties": {},
			};

			// Add request body schema if available

			if ( requestBodySchema ) {

				requestSchema.properties.body = requestBodySchema;
			}

			// Add parameter schema if available

			if ( parameterSchema ) {

				me._addParamSchema( requestSchema, parameterSchema );
			}

			return requestSchema;
		} );
	}

	/**
	 * Converts an OpenAPI parameter into a JSON Schema object and
	 * injects it into the specified parameter schema.
	 *
	 * @param {Object} requestSchema - Request schema object.
	 * @param {Object} parameterSchema - OpenAPI formatted parameter schema.
	 * @returns {void}
	 * @private
	 */
	_addParamSchema( requestSchema, parameterSchema ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		requestSchema.properties.parameters = {
			"type"       : "object",
			"properties" : {},
			"required"   : [],
		};

		// Iterate over each parameter and add it to the request schema

		_.each( parameterSchema, function ( param ) {

			param = _.clone( param );

			let paramName			= param.name;
			let paramSchema			= param.schema;
			let paramDescription	= param.description;
			let paramRequired		= param.required || false;

			paramSchema.description = paramDescription;

			requestSchema.properties.parameters.properties[ paramName ] =
				paramSchema;

			if ( paramRequired ) {

				requestSchema.properties.parameters.required.push( paramName );
			}
		} );
	}

	/**
	 * A schema representing a valid request, in JSON Schema object format.
	 *
	 * @public
	 * @returns {Promise.<Object>} Request schema.
	 * @readonly
	 */
	getRequestSchema() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		if ( me.hasConfigValue( "requestSchema" ) ) {

			return BB.resolve(
				me.getConfigValue( "requestSchema" )
			);
		}

		return me._createRequestSchema()
			.then( function ( requestSchema ) {

				me.setConfigValue( "requestSchema", requestSchema );

				return requestSchema;
			} );
	}

	// -- response schema --

	/**
	 * The absolute path to the response schema for this endpoint, which is
	 * used for _successful_ response validation within certain contexts.
	 *
	 * @public
	 * @throws {Errors.MissingResponseSchemaError} If the path to the response
	 *     schema is requested but not defined.
	 * @type {string}
	 * @readonly
	 */
	get responseSchemaPath() {

		const me = this;

		if ( !me.pathManager.hasPath( "responseSchema" ) ) {

			throw new ERRORS.MissingResponseSchemaError(
				"All endpoints MUST have a 'Response Schema Path' defined."
			);
		}

		return me.pathManager.getPath( "responseSchema" );
	}

	/**
	 * Get a schema representing a valid response, in JSON Schema object format.
	 *
	 * @public
	 * @throws {Errors.MissingResponseSchemaError} If the schema is requested
	 *     but is not defined.
	 * @returns {Promise.<Object>} Response schema.
	 */
	getResponseSchema() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		if ( me.hasConfigValue( "responseSchema" ) ) {

			return BB.resolve(
				me.getConfigValue( "responseSchema" )
			);
		}

		return me._loadResponseSchema()
			.then( function ( responseSchema ) {

				me.setConfigValue( "responseSchema", responseSchema );

				return responseSchema;
			} );
	}

	/**
	 * Set a schema representing a valid response, in JSON Schema object format.
	 *
	 * @public
	 * @param {Promise.<Object>} responseSchema - Response schema.
	 * @throws {Errors.MissingResponseSchemaError} If the schema is requested
	 *     but is not defined.
	 * @returns {void}
	 */
	setResponseSchema( responseSchema ) {

		const me = this;

		me.setConfigValue( "responseSchema", responseSchema );
	}

	/**
	 * Loads the response schema (from a file) using the `responseSchemaPath`.
	 *
	 * @private
	 * @throws {Errors.MissingResponseSchemaError} If the schema could not be
	 *     loaded (for any reason).
	 * @returns {Promise.<Object>} The loaded response schema.
	 */
	_loadResponseSchema() {

		const me = this;

		// const BB = me.$dep( "bluebird" );

		let projectPath = me.projectPath;

		let SchemaGenerator = require( "../util/SchemaGenerator" );

		let schemaGenerator = new SchemaGenerator( {
			serviceRootPath: projectPath,
		} );

		return schemaGenerator.buildSchema( me.responseSchemaPath )
			.catch( function ( err ) {

				throw new ERRORS.MissingResponseSchemaError(
					err,
					"Failed to load the response schema."
				);
			} );
	}

	// </editor-fold>

	// <editor-fold desc="--- Main Execution/Handler Logic -------------------">

	/**
	 * This is the main entry point for endpoint execution.
	 *
	 * @public
	 * @param {Object} event - The request information, including parameters,
	 *     headers, and other variables related to the request. The contents and
	 *     structure of this object will vary by run-time environment.
	 * @param {Object} [context] - Context information, from the outside. The
	 *     contents and structure of this object will vary by run-time
	 *     environment.
	 * @param {Function} [callback] - An optional callback that will be called
	 *     after the endpoint has executed successfully (or failed with an
	 *     error)
	 * @returns {Promise.<Object>} A promise that encompasses the entire
	 *     endpoint execution chain and every sub-process within.
	 */
	execute( event, context, callback ) {

		const me = this;

		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			return me._initKmsCryptConfig();

		} ).then( function () {

			// Initialize the session manager
			return me._initSessionManager();

		} ).then( function () {

			return me._prepForExecution( event, context, callback );

		} ).then( function ( executionContext ) {

			// Refuse to execute if the environment could not be resolved.
			// (We still needed the GenericExecutionContext for a graceful exit)
			if ( me.environment === "Generic" ) {

				throw new ERRORS.EnvironmentResolutionError(
					"Failed to resolve environment information."
				);
			}

			// Log the start of it
			me.$log( "info", "Endpoint execution started." );

			// Execute
			return executionContext.invokeEndpointHandler();

			// Note:
			// The call above will, basically, ask the execution context to call
			// the #handle method on this endpoint. While this may seem a little
			// odd and redundant, we need the handle() method to be executed
			// from _within_ the execution context so that context specific logic
			// can be applied to handler success and error output.
		} );
	}

	/**
	 * This is the first stage of the request processing. The goal of
	 * this method is to prepare for execution by creating an "ExecutionContext"
	 * that can be used to gather request and run-time information that will be
	 * needed by the execution logic ("#handle") later on.
	 *
	 * @private
	 * @param {Object} event - The request information, including parameters,
	 *     headers, and other variables related to the request. The contents and
	 *     structure of this object will vary by run-time environment.
	 * @param {Object} [context] - Context information, from the outside. The
	 *     contents and structure of this object will vary by run-time
	 *     environment.
	 * @param {Function} [callback] - An optional callback that will be called
	 *     after the endpoint has executed successfully (or failed with an
	 *     error)
	 * @returns {Promise.<ExecutionContext.BaseExecutionContext>} The
	 *     environment specific execution context.
	 */
	_prepForExecution( event, context, callback ) {

		const me = this;

		// Flag that allows suspend node process with non-empty event loop
		// http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
		// TODO: provide more information on why this is important
		context.callbackWaitsForEmptyEventLoop = false;

		// Convert the incoming parameters into a
		// config object, which can be more-easily
		// passed around and augmented.
		let cfg = {
			endpoint           : me,
			initialContextData : {
				event    : event,
				context  : context,
				callback : callback,
				package  : me.packageInfo,
			},
		};

		// Determine our run-time environment.
		let env = me._resolveEnvironment( cfg.initialContextData );

		// Create an "Execution Context" object that
		// is specific to our run-time environment.

		let executionContext = me.$spawn(
			"microservicesLib",
			"context/" + env + "ExecutionContext",
			cfg
		);

		return executionContext.prepare();
	}

	/**
	 * This method represents the second stage of processing for the endpoint,
	 * which is the actual fulfillment of the endpoint's function/purpose.
	 * This method is public because it is called from within an "Execution
	 * Context" object, which represents a combination of the run-time
	 * environment and the request.
	 *
	 * @public
	 * @param {Request.Request} request - A fully resolved request object that
	 *     describes the request being made to the endpoint.
	 * @returns {Promise.<Object>} The endpoint response.
	 */
	handle( request ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		let endpointType 	= me.endpointType;
		let model			= me.model;
		let modelMethod		= model[ endpointType ].bind( model );

		// Do endpoint-level parameter parsing, coercion,
		// normalization, and validation...
		me._parseParameters( request );

		// Log pre-session
		me.$log( "debug", "Endpoint execution started." );

		// Enter the promised land...
		return BB.try( function () {

			// Validate the session/token...
			return me._validateSession( request );

		} ).then( function () {

			me.$log(
				"info",
				"Session validation succeeded; executing model operation."
			);

			// Defer to the model
			// for further processing.
			return modelMethod( request );
		} );
	}

	// </editor-fold>

	// <editor-fold desc="--- Model ------------------------------------------">

	/**
	 * A fully instantiated model object that represents the endpoints
	 * primary model.
	 *
	 * @public
	 * @type {Model.BaseModel}
	 * @readonly
	 */
	get model() {

		const me = this;

		return me.getConfigValue( "model", me._initPrimaryModelObject );
	}

	/**
	 * The name of the primary model for this endpoint. Endpoints usually
	 * define a value for this in their constructor.
	 *
	 * @public
	 * @throws {Errors.ModelRequiredError} If the primary model has not been
	 *     defined.
	 * @type {string}
	 * @readonly
	 */
	get modelName() {

		const me = this;

		let val	= me.getConfigValue( "modelName", null );

		// All endpoints MUST have a .modelName
		if ( val === null ) {

			throw new ERRORS.ModelRequiredError(
				"Endpoints MUST be associated with a valid data Model. " +
				"Please ensure that this endpoint handler class is being " +
				"instantiated with a configuration that either passes a " +
				"'modelName' setting or passes a pre-instantiated data " +
				"model class as the 'model' setting."
			);
		}

		return val;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * The name of the primary model for this endpoint, but pluralized
	 * (e.g. "People").
	 *
	 * @public
	 * @throws {Errors.ModelRequiredError} If the primary model has not been
	 *     defined.
	 * @type {string}
	 * @readonly
	 */
	get pluralModelName() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		return _.pluralize( me.modelName );
	}

	/**
	 * Instantiates this endpoint's primary Model object. This method is
	 * called, exclusively, by the 'model' property's getter when the model
	 * object is requested for the first time.
	 *
	 * @private
	 * @returns {Model.BaseModel} The primary model object.
	 */
	_initPrimaryModelObject() {

		const me = this;

		// Spawn the model object
		let mdl = me._initModelObject( me.modelName );

		// Persist the model object
		me.setConfigValue( "model", mdl );

		return mdl;
	}

	/**
	 * Instantiates a model object and returns it.
	 *
	 * @private
	 * @param {string} modelName - The name of the model to spawn.
	 * @returns {Model.BaseModel} The instantiated model object.
	 */
	_initModelObject( modelName ) {

		const me = this;

		return me.$spawn( "models", modelName + "/" + modelName );
	}

	// </editor-fold>

	// <editor-fold desc="--- Environment & Execution Context ----------------">

	/**
	 * The name of the current run-time environment. This property is used to
	 * instantiate a {@link ExecutionContext.BaseExecutionContext} object during
	 * endpoint execution.
	 *
	 * @public
	 * @type {string}
	 * @default "Generic"
	 */
	get environment() {

		const me = this;

		return me.getConfigValue( "environment", "Generic" );
	}

	set environment( /** string */ val ) {

		const me = this;

		me.setConfigValue( "environment", val );
	}

	/**
	 * Whenever possible, invocation sources should provide endpoints with the
	 * name of the environment. In the cases where that is not possible,
	 * however, endpoints will need to try to figure out what environment
	 * they are being executed within. This method is the entry point for
	 * that resolution logic; it is called, automatically, if the endpoint
	 * was not provided an 'environment' value.
	 *
	 * Final: This method is marked as 'final' because the environment should
	 * always resolve in the same way, regardless of the endpoint type or
	 * request context.
	 *
	 * @private
	 * @param {?Endpoint.ContextData} contextData - Invocation context data.
	 * @returns {string} The name of the resolved environment (e.g.
	 *     "AagExecution"), which will correspond, directly, to the prefix of
	 *     an ExecutionContext class name.
	 */
	_resolveEnvironment( contextData ) {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// We can skip this if the
		// environment is already set...
		if ( me.hasConfigValue( "environment" ) ) {

			me.$log(
				"info",
				"Environment type was provided: " + me.environment
			);

			return me.environment;
		}

		// Ensure we have a contextData object
		if ( TIPE( contextData ) !== "object" ) {

			contextData = {};
		}

		if ( TIPE( contextData.event ) !== "object" ) {

			contextData.event = {};
		}

		if ( TIPE( contextData.context ) !== "object" ) {

			contextData.context = {};
		}

		// Check for recognizable patterns...
		if ( process.env.TRAVIS_JOB_NUMBER !== undefined ) {

			// Identified Travis-CI
			me.environment = "MochaCi";

		} else if ( contextData.event.isOffline === true ) {

			// Identified Serverless Offline
			me.environment = "ServerlessOffline";

			// FIXME: headers plural?
			// https://aws.amazon.com/premiumsupport/knowledge-center/custom-headers-api-gateway-lambda/

		} else if ( contextData.event.header !== undefined ) {

			// Identified AAG
			me.environment = "Aag";

		} else if ( contextData.context.invokeid !== undefined ) {

			// Identified AAG
			me.environment = "LambdaInvoke";

		} else {

			// Couldn't figure it out...
			me.environment = "Generic";
		}

		me.$log( "info", "Environment type was resolved: " + me.environment );

		return me.environment;
	}

	// </editor-fold>

	// <editor-fold desc="--- Sessions & Tokens ------------------------------">

	/**
	 * Defines whether or not the endpoint requires clients to have a valid
	 * "Session Token" when executing this endpoint. Most endpoints _should_
	 * require session tokens. The only known exceptions, at this time, are
	 * endpoints that create or update session tokens, such as `POST /Sessions`.
	 *
	 * The value for this property is usually set by endpoints within their
	 * constructor.
	 *
	 * @public
	 * @type {boolean}
	 * @default true
	 */
	get requireSession() {

		const me = this;

		return me.getConfigValue( "requireSession", true );
	}

	// noinspection JSUnusedGlobalSymbols
	set requireSession( /** boolean */ val ) {

		const me = this;

		me.setConfigValue( "requireSession", val );
	}

	/**
	 * Returns a {@link Session.SessionManager} object, which can be used to
	 * manage the current user session and its token.
	 *
	 * @public
	 * @type {Session.SessionManager}
	 */
	get sessionManager() {

		const me = this;

		return me.getConfigValue( "sessionManager", me._initSessionManager );
	}

	// noinspection JSUnusedGlobalSymbols
	set sessionManager( /** Session.SessionManager */ val ) {

		const me = this;

		me.setConfigValue( "sessionManager", val );
		me.$adopt( val );
	}

	/**
	 * Initializes a SessionManager object and attaches it to this endpoint.
	 *
	 * This method is called, exclusively, by the `constructor`.
	 *
	 * @private
	 * @returns {void} The session manager is instantiated and then stored
	 *     in the 'sessionManager' property.
	 */
	_initSessionManager() {

		const me = this;

		// We'll only ever need one...
		if ( me.hasConfigValue( "sessionManager" ) ) {

			return;
		}

		// Spawn the session manager
		let sm = me.$spawn( "microservicesLib", "session/SessionManager", {
			endpoint: me,
		} );

		// Persist the session manager
		me.setConfigValue( "sessionManager", sm );
	}

	/**
	 * This method invokes the SessionManager to validate the session/token.
	 *
	 * @private
	 * @param {Request.Request} request - A fully resolved request object that
	 *     describes the request being made to the endpoint.
	 * @returns {Promise.<Request.Request>} A promise, resolved with the
	 *     provided 'Request' object, unless session validation fails. If
	 *     validation fails, then errors will be THROWN and should be caught
	 *     higher up in the chain.
	 */
	_validateSession( request ) {

		const me = this;

		return me.sessionManager.validateRequest( request );
	}

	// </editor-fold>

	// <editor-fold desc="--- Abstract Methods -------------------------------">

	/**
	 * Applies endpoint-specific parameter parsing. This method is called,
	 * exclusively, by an ExecutionContext object.
	 *
	 * If any parameter is found to be invalid, child methods should
	 * THROW errors with the appropriate status code.
	 *
	 * Child methods may, also, freely modify the request object, as needed,
	 * if coercion (as opposed to rejection) is desired.
	 *
	 * @abstract
	 * @private
	 * @param {Request.Request} request - A Request object.
	 * @returns {void} Child methods should either THROW errors or modify the
	 *     request object byRef.
	 */
	_parseParameters( request ) { // eslint-disable-line no-unused-vars

		// FIXME: should private methods encourage overriding?

		// The default behavior is to do nothing.
		// Child classes should override this method
		// if they need special parameter parsing.
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * <this is a while away>
	 *
	 * Applies endpoint-specific access verification. This method is called,
	 * exclusively, by an ExecutionContext object.
	 *
	 * If access is denied, child methods should THROW errors with
	 * the appropriate status code.
	 *
	 * Alternatively, child methods may modify the request if complete
	 * request denial is not warranted.
	 *
	 * @abstract
	 * @protected
	 * @param {Request.Request} request - A Request object.
	 * @returns {void} Child methods should THROW if access is denied, or they
	 *     may modify the request object byRef.
	 */
	checkAccess( request ) {

		// The default behavior is to allow execution.
		// Child classes should override this method
		// if they need to apply ACM logic.
	}

	// </editor-fold>

	// Misc / Needs Work:

	/**
	 * The contents of the endpoint service's package.json file.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 * @todo Remove this or move it to BaseExecutionContext.
	 */
	get packageInfo() {

		const me = this;

		let cur	= me.getConfigValue( "packageInfo", null );

		if ( cur === null ) {

			let pm		= me.pathManager;
			let pkgPath	= pm.join( "project", "package.json" );

			cur = require( pkgPath );
			me.setConfigValue( "packageInfo", cur );
		}

		return cur;
	}

	/**
	 * The name of the endpoint's service (from package.json).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 * @todo Remove this or move it to BaseExecutionContext.
	 */
	get serviceName() {

		const me = this;

		return me.packageInfo.name;
	}

	/**
	 * The current version of the endpoint's service repo (from package.json).
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 * @todo Remove this or move it to BaseExecutionContext.
	 */
	get serviceVersion() {

		const me = this;

		return me.packageInfo.version;
	}

	/**
	 * The operationId for the current endpoint, which is its class name.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 * @todo Decide if this should be moved to BaseExecutionContext.
	 */
	get operationId() {

		const me = this;

		return me.constructor.name;
	}
}

module.exports = BaseEndpoint;
