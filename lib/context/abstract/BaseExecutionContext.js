/**
 * @file Defines the BaseExecutionContext class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

// Important Note
// --------------
// This module only loads a single dependency, directly, which is the
// parent class for the class defined within. This is intended to force
// dependency loading through the parent class, by way of the `$dep()`
// method, in order to centralize dependency definition and loading.

const BaseClass	= require( "@corefw/common" ).common.BaseClass;
const ERRORS	= require( "../../errors" );

/**
 * Provides an abstract class that encapsulates the contextual data that
 * surrounds an endpoint execution request.
 *
 * @abstract
 * @memberOf ExecutionContext.Abstract
 * @extends Common.BaseClass
 */
class BaseExecutionContext extends BaseClass {

	// <editor-fold desc="--- Static Methods ---------------------------------">

	// None yet...

	// </editor-fold>

	// <editor-fold desc="--- Construction and Initialization ----------------">

	/**
	 * @inheritDoc
	 */
	_initialize( cfg ) {

		// const me = this;

		// Call parent
		super._initialize( cfg );
	}

	/**
	 * Prepares the execution context.
	 *
	 * @returns {Promise<BaseExecutionContext>} This execution context.
	 */
	prepare() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			// Parse the initial context data
			return me._processInitialContextData();

		} ).then( function () {

			// Initialize the logger
			return me._initLogger();

		} ).then( function () {

			// Prep the target endpoint
			return me.prepareEndpoint();

		} ).then( function () {

			return me;
		} );
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

		return pm;

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
		//
		// pm.setPath( "microservicesLib", PATH.join( __dirname, ".." ) );
		//
		// return pm;
	}

	// </editor-fold>

	// <editor-fold desc="--- Logging ----------------------------------------">

	/**
	 * Configuration overrides for the {@link Logging.Logger} object.
	 *
	 * @public
	 * @type {Object}
	 * @default {}
	 */
	get loggerConfigOverrides() {

		const me = this;

		return me.getConfigValue( "loggerConfig", {} );
	}

	set loggerConfigOverrides( /** Object */ val ) {

		const me = this;

		me.setConfigValue( "loggerConfig", val );
	}

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

		return "msa.endpoint." + me.apiStage + "." + me.shortServiceName + "." +
			me.modelName + "." + me.endpointName;
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
	 * Create a configuration object, suitable for this execution context,
	 * to be used when instantiating a new logger object.
	 *
	 * @private
	 * @param {Object} [loggerConfigOverrides] - Optional overrides for the
	 *     context's default logger configuration.
	 * @returns {Object} A plain configuration object to be passed to
	 *     the constructor of new Logger objects.
	 */
	_createLoggerConfig( loggerConfigOverrides ) {

		const me = this;

		// Setup the initial logger config based on
		// information pulled from the context/environment.
		let baseConfig = {
			application : me.applicationName,
			namePrefix  : me.loggerPrefix,
			values      : {
				requestId : me.requestId,
				seriesId  : me.seriesId,
				api       : {
					stage : me.apiStage,
					key   : me.apiKey,
				},
				endpoint: {
					name        : me.endpointName,
					model       : me.modelName,
					environment : me.endpoint.environment,
				},
				service: {
					name    : me.serviceName,
					version : me.serviceVersion,
				},
				session: {
					sessionId : null,
					namespace : "default",
					token     : {
						clientIp : null,
						flags    : null,
						version  : null,
					},
				},
				user: {
					userId   : null,
					personId : null,
					username : null,
				},
			},
		};

		// Apply overrides, if necessary, and return
		return Object.assign( {}, baseConfig, loggerConfigOverrides );
	}

	// </editor-fold>

	// <editor-fold desc="--- Basic Context Data Properties ------------------">

	/**
	 * The endpoint being executed.
	 *
	 * @public
	 * @type {Endpoint.BaseEndpoint}
	 */
	get endpoint() {

		const me = this;

		return me.getConfigValue( "endpoint", null );
	}

	set endpoint( /** Endpoint.BaseEndpoint */ val ) {

		const me = this;

		me.setConfigValue( "endpoint", val );
	}

	/**
	 * Get the current request.
	 *
	 * @public
	 * @readonly
	 * @returns {Promise<Request.Request>} Request object.
	 */
	getRequest() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			// Request object already exists, return it...
			if ( me.hasConfigValue( "request" ) ) {

				return me.getConfigValue( "request" );
			}

			// Create, set, and return request object...
			return BB.try( function () {

				return me._createRequestObject();

			} ).then( function ( request ) {

				me.setConfigValue( "request", request );

				return request;
			} );
		} );
	}

	/**
	 * Get the processed endpoint parameters; pulled from the Request.
	 *
	 * @public
	 * @returns {Promise<Object>} Parameters.
	 */
	getParameters() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			return me.getRequest();

		} ).then( function ( request ) {

			return request.parameters;
		} );
	}

	/**
	 * Get raw parameter information; the structure of this variable will
	 * vary by execution context.
	 *
	 * @public
	 * @returns {Object} Raw parameters.
	 */
	getRawParameters() {

		const me = this;

		return me.getConfigValue( "rawParameters", {} );
	}

	/**
	 * Set raw parameter information; the structure of this variable will
	 * vary by execution context.
	 *
	 * @public
	 * @param {Object} rawParameters - Raw parameters.
	 * @returns {void}
	 */
	setRawParameters( rawParameters ) {

		const me = this;

		me.setConfigValue( "rawParameters", rawParameters );
	}

	/**
	 * Get request body.
	 *
	 * @public
	 * @returns {Object} Request body.
	 */
	getRequestBody() {

		const me = this;

		return me.getConfigValue( "requestBody", null );
	}

	/**
	 * Set request body.
	 *
	 * @public
	 * @param {Object} requestBody - Request body.
	 * @returns {void}
	 */
	setRequestBody( requestBody ) {

		const me = this;

		me.setConfigValue( "requestBody", requestBody );
	}

	/**
	 * The requestId of the current request.
	 *
	 * @public
	 * @type {string}
	 */
	get requestId() {

		const me = this;

		return me.getContextValue(
			[ "requestId" ]
		);
	}

	set requestId( /** string */ val ) {

		const me = this;

		me.contextData.requestId = val;
	}

	/**
	 * The seriesId of the current request. This will usually be the
	 * same as the requestId unless forcibly overridden by the client.
	 *
	 * @public
	 * @type {string}
	 */
	get seriesId() {

		const me = this;

		let cur	= me.getConfigValue( "seriesId", null );

		if ( cur === null ) {

			return me.requestId;
		}

		return cur;
	}

	set seriesId( /** string */ val ) {

		const me = this;

		me.setConfigValue( "seriesId", val );
	}

	/**
	 * The name of the current "API Stage" (e.g. "v5", "v5-dev", etc).
	 *
	 * @public
	 * @readonly
	 * @type {?string}
	 */
	get apiStage() {

		const me = this;

		return me.getContextValue(
			[ "apiStage", "serverlessStage", "apiId" ]
		);
	}

	/**
	 * The IP Address of the requesting client.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get clientIp() {

		const me = this;

		return me.getContextValue(
			[ "clientIp" ]
		);
	}

	/**
	 * The name of the current service (e.g. `sls-service-geographical`). This
	 * is typically pulled from the local package.json of the service's
	 * repository.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get serviceName() {

		const me = this;

		return me.getContextValue(
			[ "serviceName" ]
		);
	}

	/**
	 * The shortened name of the current service (e.g. `geographical`). This
	 * is typically pulled from the local package.json of the service's
	 * repository.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get shortServiceName() {

		const me = this;

		let name	= me.serviceName;
		let spl		= name.split( "-" );

		return spl[ spl.length - 1 ];
	}

	/**
	 * The current version of the service (e.g. `5.1.2`). This
	 * is typically pulled from the local package.json of the service's
	 * repository.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get serviceVersion() {

		const me = this;

		return me.getContextValue(
			[ "serviceVersion" ]
		);
	}

	/**
	 * The name of the endpoint being executed (e.g. `ReadManyAddresses`). This
	 * is the name of the endpoint class.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get endpointName() {

		const me = this;

		return me.endpoint.constructor.name;
	}

	/**
	 * The name of the primary model of the current endpoint.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get modelName() {

		const me = this;

		return me.endpoint.modelName;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * This is an alias for
	 * {@link ExecutionContext.BaseExecutionContext#endpointName}.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get operationId() {

		const me = this;

		return me.endpointName;
	}

	/**
	 * The full name of the current endpoint, which includes the service name.
	 * (e.g. `sls-service-geographical:ReadManyAddresses`). This is primarily
	 * used for logging purposes.
	 *
	 * @public
	 * @readonly
	 * @type {string}
	 */
	get applicationName() {

		const me = this;

		return me.serviceName + ":" + me.endpointName;
	}

	// </editor-fold>

	// <editor-fold desc="--- Context Data Processing: Initial ---------------">

	/**
	 * The context data that was passed into this execution context's
	 * constructor.
	 *
	 * @public
	 * @type {Object}
	 */
	get initialContextData() {

		const me = this;

		return me.getConfigValue( "initialContextData", {} );
	}

	set initialContextData( /** Object */ val ) {

		const me = this;

		me.setConfigValue( "initialContextData", val );
		me._processInitialContextData();
	}

	/**
	 * The goal of this method is to collect as much information as it can about
	 * the request and the run-time environment as it can and store that
	 * information in generic formats that can be easily searched and parsed
	 * later (by specialist methods and classes). To that end, this method will
	 * populate a few fundamental properties with as much information as it can
	 * gather:
	 *
	 *
	 *   * contextDataIndex - A flat object that will be populated with as much
	 *                        contextual data as can be reasonably gathered.
	 *
	 *   * rawParameters    - Variables related to the request that this
	 *                        endpoint needs to process, imminently.
	 *
	 *   * callback         - An optional function callback that may have
	 *                        been provided to the endpoint by the external
	 *                        invocation mechanism. If provided, it will be
	 *                        called after all processing has completed.
	 *
	 *
	 * @private
	 * @returns {Promise<void>} Void.
	 */
	_processInitialContextData() {

		const me = this;

		// Dependencies
		const BB	= me.$dep( "bluebird" );
		const TIPE	= me.$dep( "tipe" );

		return BB.try( function () {

			let data = me.initialContextData;

			// Append environment variables to
			// the initialContextData object
			data.env = process.env;

			// Check for logger config overrides
			if (
				TIPE( data.context ) === "object" &&
				TIPE( data.context.loggerConfig ) === "object"
			) {

				me.loggerConfigOverrides = data.context.loggerConfig;

				delete data.context.loggerConfig;
			}

			// A few pre-processing normalization steps.
			me._normalizeInitialContextData();

			// Create the 'contextDataIndex'
			me._createContextDataIndex( data );

			// Process the context data index
			// for known patterns.
			me._resolveContextData();

			// Process for callback
			if ( TIPE( data.callback ) === "function" ) {

				me.setConfigValue( "callback", data.callback );
			}

			// Process parameters and request body
			me._resolveParameters();
			me._resolveRequestBody();
		} );
	}

	/**
	 * This method will do a few basic normalization steps to
	 * the initial context data, before it is processed, to
	 * increase/improve consistency.
	 *
	 * @abstract
	 * @private
	 * @returns {void} All modifications are made ByRef.
	 */
	_normalizeInitialContextData() {

		// Do Nothing
	}

	// </editor-fold>

	// <editor-fold desc="--- Context Data Processing: Indexing --------------">

	/**
	 * Creates the "context data index" (a flat key/value store for
	 * context data) from the provided 'data'.
	 *
	 * @private
	 * @param {Object} data - The data to use in the context data index.
	 * @returns {void} The context data index is stored in the
	 *     'contextDataIndex' property.
	 */
	_createContextDataIndex( data ) {

		const me = this;

		const maxParseDepth = 10;

		// Start the recursive processing of the initial
		// context data into the context data index.
		me._flattenObject( data, me.contextDataIndex, maxParseDepth );
	}

	/**
	 * A utility method that recursively scans an object and collapses its
	 * non-function properties into a flat, key/value, and dot-indexed object.
	 *
	 * @private
	 * @param {Object} obj - The object to be flattened.
	 * @param {Object} store - The key/value object to store flatted properties
	 *     in.
	 * @param {number} maxDepth - The maximum depth to search with 'obj'
	 * @param {string} [prefix=""] - The prefix to add to properties found in
	 *     the search.
	 * @param {number} [curDepth=0] - The current depth of the search.
	 * @returns {void} All results are stored ByRef
	 */
	_flattenObject( obj, store, maxDepth, prefix, curDepth ) {

		const me = this;

		// Dependencies
		const _ 	= me.$dep( "lodash" );
		const TIPE 	= me.$dep( "tipe" );

		// Param Defaults
		if ( TIPE( prefix ) !== "string" ) {

			prefix = "";
		}

		if ( TIPE( curDepth ) !== "number" ) {

			curDepth = 0;
		}

		// Restrict Scan Depth
		if ( curDepth > maxDepth ) {

			return;
		}

		// Iterate over the object properties
		_.each( obj, function ( v, k ) {

			// All keys will be stored
			// in lower case.
			k = k.toLowerCase();

			// Process this item...
			if ( TIPE( v ) === "object" ) {

				// Dive deeper into objects
				me._flattenObject(
					v,
					store,
					maxDepth,
					prefix + k + ".",
					curDepth + 1
				);

			} else if ( TIPE( v ) !== "function" ) {

				// Keep anything that's not a function
				store[ prefix + k ] = v;
			}
		} );
	}

	/**
	 * A plain object that holds all context and environment data in a
	 * semi-unorganized/unresolved format.
	 *
	 * @public
	 * @readonly
	 * @type {Object}
	 */
	get contextDataIndex() {

		const me = this;

		return me.getConfigValue( "contextDataIndex", {} );
	}

	/**
	 * This method will attempt to extract information from the raw
	 * contextDataIndex by applying a number of known patterns and
	 * data search locations. Child classes will typically override or
	 * extend this method, because each execution context will express
	 * context data in different ways, but this method will cover a few
	 * of the most universal patterns.
	 *
	 * @private
	 * @returns {void} All changes are made, ByRef, to the 'contextData'
	 *     property.
	 */
	_resolveContextData() {

		const me = this;

		const rcdi = me._resolveContextDataItem.bind( me );

		// AWS
		rcdi( "awsAccessKeyId",		"env.aws_access_key_id"				);
		rcdi( "awsAccountId",		"event.requestcontext.accountid"	);
		rcdi( "awsSecretAccessKey",	"env.aws_secret_access_key"			);
		rcdi( "awsTraceId",			"env._x_amzn_trace_id"				);

		rcdi(
			"awsAccountId",
			"context.invokedfunctionarn",
			function ( value ) {

				// arn:aws:lambda:us-east-1:277549955817:function:sls-service-competition-dev-ReadManyActivities
				let spl = value.split( ":" );

				return spl[ 4 ];
			}
		);

		// AWS: AAG/API
		rcdi( "apiHost",		"event.headers.host"				);
		rcdi( "apiId",			"event.requestcontext.apiid"		);
		rcdi( "apiPath",		"event.path"						);
		rcdi( "apiPath",		"event.gatewaycontext.path"			);
		rcdi( "apiPathFull",	"event.requestcontext.path"			);
		rcdi( "apiPort",		"event.headers.x-forwarded-port"	);
		rcdi( "apiProtocol",	"event.headers.x-forwarded-proto"	);
		rcdi( "apiResource",	"event.resource"					);
		rcdi( "apiResource",	"event.requestcontext.resourcepath"	);
		rcdi( "apiResourceId",	"event.requestcontext.resourceid"	);
		rcdi( "apiResourceId",	"event.gatewaycontext.resource"		);
		rcdi( "apiStage",		"event.requestcontext.stage"		);
		rcdi( "apiStage",		"env.sls_default_stage"				);
		rcdi( "apiKey",			"event.headers.x-api-key"			);

		// AWS: CLOUDFRONT
		rcdi( "cfForwardedFor",			"event.headers.x-forwarded-for"					);
		rcdi( "cfForwardedProtocol",	"event.headers.cloudfront-forwarded-proto"		);
		rcdi( "cfProxyHost",			"event.headers.via"								);
		rcdi( "cfRequestId",			"event.headers.x-amz-cf-id"						);
		rcdi( "cfViewerCountry",		"event.headers.cloudfront-viewer-country"		);
		rcdi( "cfViewerDesktop",		"event.headers.cloudfront-is-desktop-viewer"	);
		rcdi( "cfViewerMobile",			"event.headers.cloudfront-is-mobile-viewer"		);
		rcdi( "cfViewerSmartTTY",		"event.headers.cloudfront-is-smarttv-viewer"	);
		rcdi( "cfViewerTablet",			"event.headers.cloudfront-is-tablet-viewer"		);

		// AWS: COGNITO
		rcdi( "cognitoAuthProvider",	"event.requestcontext.identity.cognitoauthenticationprovider"	);
		rcdi( "cognitoAuthType",		"event.requestcontext.identity.cognitoauthenticationtype"		);
		rcdi( "cognitoIdentityId",		"event.requestcontext.identity.cognitoidentityid"				);
		rcdi( "cognitoPoolId",			"event.requestcontext.identity.cognitoidentitypoolid"			);

		// AWS: IDENTITY
		rcdi( "identityAccessKey",	"event.requestcontext.identity.accesskey"	);
		rcdi( "identityAccountId",	"event.requestcontext.identity.accountid"	);
		rcdi( "identityApiKey",		"event.requestcontext.identity.apikey"		);
		rcdi( "identityCaller",		"event.requestcontext.identity.caller"		);
		rcdi( "identityUserArn",	"event.requestcontext.identity.userarn"		);
		rcdi( "identityUsername",	"event.requestcontext.identity.user"		);

		// AWS: LAMBDA
		rcdi( "lambdaEnvironment",		"env.aws_execution_env"							);
		rcdi( "lambdaFunctionArn",		"context.invokedfunctionarn"					);
		rcdi( "lambdaFunctionName",		"context.functionname"							);
		rcdi( "lambdaFunctionName",		"env.aws_lambda_function_name"					);
		rcdi( "lambdaFunctionVersion",	"context.functionversion"						);
		rcdi( "lambdaFunctionVersion",	"env.aws_lambda_function_version"				);
		rcdi( "lambdaHandler",			"env._handler"									);
		rcdi( "lambdaInvokeId",			"context.invokeid"								);
		rcdi( "lambdaLibraryPath",		"env.ld_library_path",					"path"	);
		rcdi( "lambdaMemorySize",		"context.memorylimitinmb"						);
		rcdi( "lambdaMemorySize",		"env.aws_lambda_function_memory_size"			);
		rcdi( "lambdaRuntimeDir",		"env.lambda_runtime_dir"						);
		rcdi( "lambdaTaskRoot",			"env.lambda_task_root"							);

		// AWS: LOG GROUP
		rcdi( "logGroupName",	"context.loggroupname"				);
		rcdi( "logStreamName",	"context.logstreamname"				);
		rcdi( "logGroupName",	"env.aws_lambda_log_group_name"		);
		rcdi( "logStreamName",	"env.aws_lambda_log_stream_name"	);

		// AWS: XRAY
		rcdi( "xRayHost",			"env._aws_xray_daemon_address"	);
		rcdi( "xRayPort",			"env._aws_xray_daemon_port"		);
		rcdi( "xRayAddress",		"env.aws_xray_daemon_address"	);
		rcdi( "xRayContextMissing",	"env.aws_xray_context_missing"	);

		// ENVIRONMENT
		rcdi( "args",					"env.args"						);
		rcdi( "createdAt",				"env.created_at"				);
		rcdi( "cwd",					"env.cwd"						);
		rcdi( "environmentLanguage",	"env.lang"						);
		rcdi( "execInterpretter",		"env.exec_interpreter"			);
		rcdi( "home",					"env.home"						);
		rcdi( "hostname",				"env.hostname"					);
		rcdi( "hostname",				"event.headers.host"			);
		rcdi( "path",					"env.path",				"path"	);
		rcdi( "processName",			"env.name"						);
		rcdi( "processName",			"context.functionname"			);
		rcdi( "timezone",				"env.tz"						);

		// ENVIRONMENT: DOCKER
		rcdi( "isInDocker",			"env.c2c_docker",			true	);

		// ENVIRONMENT: MOCHA
		rcdi( "isMocha",			"env.loaded_mocha_opts",	true 	);

		// ENVIRONMENT: NODE
		rcdi( "nodeBinary",			"env._"						);
		rcdi( "nodeEnvironment",	"env.node_env"				);
		rcdi( "nodePath",			"env.node_path",	"path"	);
		rcdi( "nodeVersion",		"env.node_version"			);

		// ENVIRONMENT: PM2
		rcdi( "isPm2",				"env.pm2_home",		true	);

		// GENERIC
		rcdi( "clientIp",			"event.gatewaycontext.sourceip"								);
		rcdi( "clientIp",			"event.requestcontext.identity.sourceip"					);
		rcdi( "region",				"env.aws_default_region"									);
		rcdi( "region",				"env.aws_region",							null,	true	);
		rcdi( "requestId",			"context.awsrequestid"										);
		rcdi( "requestId",			"context.requestid"											);
		rcdi( "requestId",			"event.requestcontext.requestid"							);
		rcdi( "requestId",			"context.invokeid"											);
		rcdi( "requestIsBase64",	"event.isbase64encoded"										);

		// HTTP
		rcdi( "contentType",		"event.headers.content-type"				);
		rcdi( "httpAccept",			"event.headers.accept"						);
		rcdi( "httpAcceptEncoding",	"event.headers.accept-encoding"				);
		rcdi( "httpAcceptLanguage",	"event.headers.accept-language"				);
		rcdi( "httpMethod",			"event.gatewaycontext.httpmethod"			);
		rcdi( "httpMethod",			"event.httpmethod"							);
		rcdi( "httpMethod",			"event.requestcontext.httpmethod"			);
		rcdi( "httpOrigin",			"event.headers.origin"						);
		rcdi( "httpReferer",		"event.headers.referer"						);
		rcdi( "httpUser",			"event.gatewaycontext.user"					);
		rcdi( "userAgent",			"event.headers.user-agent"					);
		rcdi( "userAgent",			"event.requestcontext.identity.useragent"	);

		// MYSQL
		rcdi( "mysqlHost",			"env.mysql_host"		);
		rcdi( "mysqlPassword",		"env.mysql_password"	);
		rcdi( "mysqlPort",			"env.mysql_port"		);
		rcdi( "mysqlUsername",		"env.mysql_username"	);

		// NPM
		rcdi( "npmApiKey",			"env.npm_api_key"			);
		rcdi( "npmLogLevel",		"env.npm_config_loglevel"	);
		rcdi( "npmToken",			"env.npm_token"				);

		// REDIS
		rcdi( "redisHost",			"env.redis_host"		);
		rcdi( "redisPassword",		"env.redis_auth_pass"	);
		rcdi( "redisPort",			"env.redis_port"		);

		// SERVERLESS
		rcdi( "serverlessProject",	"env.sls_default_project"	);
		rcdi( "serverlessStage",	"env.sls_default_stage"		);

		// SERVERLESS OFFLINE
		rcdi( "isServerlessOffline",	"env.is_offline",	true	);

		// SESSION/AUTH
		rcdi( "sessionToken",		"event.headers.x-session-token"		);

		// --------------------------------------------------------------------------------------------------

		// PACKAGE.JSON
		rcdi( "nodeDependencies",		/^package\.dependencies\./,		depParser,	true	);
		rcdi( "nodeDevDependencies",	/^package\.devdependencies\./,	depParser,	true	);
		rcdi( "serviceAuthor",			"package.author.name"								);
		rcdi( "serviceAuthorEmail",		"package.author.email"								);
		rcdi( "serviceDescription",		"package.description"								);
		rcdi( "serviceKeywords",		"package.keywords"									);
		rcdi( "serviceName",			"package.name"										);
		rcdi( "serviceRepository",		"package.repository"								);
		rcdi( "serviceVersion",			"package.version"									);
		rcdi( "sourceLicense",			"package.license"									);

		/**
		 * Helper function for processing package dependencies.
		 *
		 * @param {*} value - Value.
		 * @param {string} key - Key.
		 * @param {string} itm - Item.
		 * @param {Object} data - Data.
		 * @returns {null} Null. The parser updates the data object directly.
		 */
		function depParser( value, key, itm, data ) {

			let spl = key.split( "." );
			let pkg = spl[ spl.length - 1 ];

			if ( !data[ itm ] ) {

				data[ itm ] = {};
			}

			data[ itm ][ pkg ] = value;

			return null;
		}
	}

	/**
	 * This utility method will search the contextDataIndex in an effort to
	 * resolve the value of a single context data item.
	 *
	 * @private
	 * @param {string} dataItem - The name of the contextData property that will
	 *     be updated if the searchPattern matches any items in the
	 *     contextDataIndex.
	 * @param {string|RegExp} searchPattern - The pattern to use while
	 *     traversing the contextDataIndex in search of a value for the
	 *     'dataItem'.
	 * @param {?string|boolean|function} [parser=null] - Determines how the new
	 *     value is set, if one is found. If a STRING is passed (such as
	 *     "json"), then it will be used as an indicator for a special handler.
	 *     If a BOOLEAN is passed, then it will be used as the literal value.
	 *     If a FUNCTION is passed, then it will be called (with the actual
	 *     value found) and the result of its execution will be used as the
	 *     value for the property.
	 * @param {boolean} [overwrite=false] - If FALSE and a value for the target
	 *     'dataItem' has already been resolved, then the search will be
	 *     aborted. If TRUE and a value is found in the search, it will be used
	 *     to replace the existing value.
	 * @returns {void} All changes (if any) are made, ByRef, to the
	 *     'contextData' property.
	 */
	_resolveContextDataItem( dataItem, searchPattern, parser, overwrite ) {

		const me = this;

		// Dependencies
		const _ 	= me.$dep( "lodash" );
		const TIPE 	= me.$dep( "tipe" );

		let index 	= me.contextDataIndex;
		let data 	= me.contextData;

		// Param defaults
		if ( parser === undefined ) {

			parser = null;
		}

		if ( overwrite !== true ) {

			overwrite = false;
		}

		// Special parser logic
		if ( parser === "cumulative" ) {

			overwrite = true;
		}

		// No need to search for things we already
		// have if 'overwrite' is FALSE
		if (
			!overwrite &&
			data[ dataItem ] !== undefined &&
			data[ dataItem ] !== null
		) {

			return;
		}

		// Search strings should be lower case...
		if ( TIPE( searchPattern ) === "string" ) {

			searchPattern = searchPattern.toLowerCase();
		}

		// Iterate over the index
		_.each( index, function ( value, key ) {

			let found = false;

			if ( TIPE( searchPattern ) === "string" ) {

				if ( key === searchPattern ) {

					found = true;
				}

			} else if ( TIPE( searchPattern ) === "regexp" ) {

				if ( key.match( searchPattern ) ) {

					found = true;
				}
			}

			// Apply parser logic to
			// resolve the final value
			if ( found ) {

				if ( parser === null ) {

					data[ dataItem ] = value;

				} else if ( parser === true || parser === false ) {

					data[ dataItem ] = parser;

				} else if ( parser === "json" ) {

					data[ dataItem ] = JSON.parser( value );

				} else if ( parser === "path" ) {

					data[ dataItem ] = value.split( ":" );

				} else if ( parser === "cumulative" ) {

					if ( TIPE( data[ dataItem ] ) !== "array" ) {

						data[ dataItem ] = [];
					}

					data[ dataItem ].push( value );

				} else if ( TIPE( parser ) === "function" ) {

					let parserResult = parser(
						value, key, dataItem, data, index
					);

					if ( parserResult !== null ) {

						data[ dataItem ] = parserResult;
					}

				} else {

					data[ dataItem ] = value;
				}

				// Strings can only match a single item,
				// so we will end the search after a match.
				if ( TIPE( searchPattern ) === "string" ) {

					return false;
				}

				// If overwrite is FALSE, then we should end
				// the search after the first result...
				if ( overwrite === false ) {

					return false;
				}
			}

			// continue search
			return true;
		} );

		// We want a value of NULL for things
		// that we have not found.
		if ( data[ dataItem ] === undefined ) {

			data[ dataItem ] = null;
		}
	}

	// </editor-fold>

	// <editor-fold desc="--- Final Context Data Management ------------------">

	/**
	 * All available context data, in an organized/resolved format.
	 *
	 * @public
	 * @type {Object}
	 */
	get contextData() {

		const me = this;

		return me.getConfigValue( "contextData", {} );
	}

	set contextData( /** Object */ val ) {

		const me = this;

		me.setConfigValue( "contextData", val );
	}

	/**
	 * Searches for and returns context data values.
	 *
	 * @public
	 * @param {string|string[]} itemKeys - One or more context data keys that
	 *     may contain the desired value. They will be evaluated in the order
	 *     that they are given and the first key that has a value will be
	 *     returned.
	 * @param {*} [defaultValue] - If provided, and the value could not be
	 *     found, this value will be returned (instead of null).
	 * @returns {*} The context data value.
	 */
	getContextValue( itemKeys, defaultValue ) {

		const me = this;

		// Dependencies
		const TIPE 		= me.$dep( "tipe" );
		const _ 		= me.$dep( "lodash" );

		let data	= me.contextData;
		let ret		= null;

		// Apply a default
		if ( defaultValue !== undefined ) {

			ret = defaultValue;
		}

		// Coerce itemKeys to an array
		if ( TIPE( itemKeys ) !== "array" ) {

			itemKeys = [ itemKeys ];
		}

		// Search for each key
		_.each( itemKeys, function ( key ) {

			if ( data[ key ] === undefined ) {

				throw new ERRORS.InvalidContextKeyError(
					"Internal Error: A context data lookup attempt " +
					"referenced a context item key ('" + key + "') that is " +
					"not valid or recognized."
				);
			}

			// value found, end search
			if ( data[ key ] !== null ) {

				ret = data[ key ];

				return false;
			}

			// continue search
			return true;
		} );

		return ret;
	}

	// </editor-fold>

	// <editor-fold desc="--- Authentication / Sessions / Tokens -------------">

	/**
	 * The current API key being used to access the endpoint (if available).
	 * This property will not be available in all execution contexts, and
	 * probably will only be available within contexts related to AWS AAG.
	 *
	 * @public
	 * @readonly
	 * @type {?string}
	 */
	get apiKey() {

		const me = this;

		return me.getContextValue(
			[ "apiKey" ]
		);
	}

	/**
	 * The raw, encoded, session token, if available.
	 *
	 * @public
	 * @type {?string}
	 */
	get sessionToken() {

		const me = this;

		return me.getContextValue(
			[ "sessionToken" ]
		);
	}

	set sessionToken( /** ?string */ val ) {

		const me = this;

		me.contextData.sessionToken = val;
	}

	/**
	 * When overridden, this special variable allows certain execution contexts
	 * to indicate that the "developer token" should be used for endpoint
	 * execution, which more-or-less disables user-level security. This is
	 * most useful for testing endpoints in non-production environments.
	 *
	 * @public
	 * @type {boolean}
	 * @default false
	 */
	get useDevelopmentToken() {

		const me = this;

		return me.getConfigValue( "useDevelopmentToken", false );
	}

	set useDevelopmentToken( /** boolean */ val ) {

		const me = this;

		me.setConfigValue( "useDevelopmentToken", val );
	}

	/**
	 * This special variable instructs the {@link Session.SessionManager} to
	 * ignore/allow expired tokens. This variable will _always_ be TRUE if
	 * `useDevelopmentToken` is TRUE.
	 *
	 * @public
	 * @type {boolean}
	 * @default false
	 */
	get ignoreTokenExpiration() {

		const me = this;

		if ( me.useDevelopmentToken === true ) {

			return true;
		}

		return me.getConfigValue( "ignoreTokenExpiration", false );
	}

	set ignoreTokenExpiration( /** boolean */ val ) {

		const me = this;

		me.setConfigValue( "ignoreTokenExpiration", val );
	}

	// </editor-fold>

	// <editor-fold desc="--- Request Parameter & Body Resolution/Logic ------">

	/**
	 * Resolves the request parameters from all available context data.
	 *
	 * @private
	 * @returns {void} All modifications are made, ByRef, to the rawParameters
	 *     property.
	 */
	_resolveParameters() {

		const me = this;

		me.setRawParameters( me.initialContextData.event.parameters );
	}

	/**
	 * Resolves the request body from all available context data.
	 *
	 * @protected
	 * @returns {void} All modifications are made, ByRef, to the requestBody
	 *     property.
	 */
	_resolveRequestBody() {

		const me = this;

		me.setRequestBody( me.initialContextData.event.body );
	}

	// </editor-fold>

	// <editor-fold desc="--- Endpoint Execution: Starting (Request) ---------">

	/**
	 * This is the main execution entry point for the execution context, which
	 * invokes the endpoint's "handler" method.
	 *
	 * @public
	 * @returns {Promise<Object>} The formatted success or failure response.
	 */
	invokeEndpointHandler() {

		const me = this;

		// Dependencies
		const BB	= me.$dep( "bluebird" );
		const _		= me.$dep( "lodash" );

		return BB.try( function () {

			// Get request object
			return me.getRequest();

		} ).then( function ( /** Request.Request */ request ) {

			// NOTE: The request.validate() below used to reside within the
			// getRequest()->_createRequestObject() chain of calls.
			//
			// Request validation errors would prevent the request object
			// from being set into the config.
			//
			// During the failure response creation, the request object is
			// requested again, but since it was never set the first time, it
			// would cause a second round of validation failures outside of the
			// initial catch() that handled the first validation failure.

			// Validate the request
			return request.validate();

		} ).then( function ( request ) {

			let ep = me.endpoint;

			// Execute the handler
			return ep.handle( request );

		} ).then( function ( response ) {

			let data		= response;
			let pagination	= null;

			if ( _.isArray( response ) ) {

				data		= response[ 0 ];
				pagination	= response[ 1 ];
			}

			// Finalize the execution
			return me._succeed( data, pagination );

		} ).catch( function ( err ) {

			// Finalize the execution
			return me._fail( err );
		} );
	}

	/**
	 * Creates a new Request object. This method is called, exclusively,
	 * by the 'request' getter, as needed.
	 *
	 * @private
	 * @returns {Promise<Request.Request>} The new request object
	 */
	_createRequestObject() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		/** @type {Request.Request} */
		let request;

		return BB.try( function () {

			request = me.$spawn(
				"microservicesLib",
				"request/Request",
				{
					context: me,
				}
			);

		} ).then( function () {

			return me.getRawParameters();

		} ).then( function ( rawParameters ) {

			return request.setRawParameters( rawParameters );

		} ).then( function () {

			request.body = me.getRequestBody();

			return request;
		} );
	}

	// </editor-fold>

	// <editor-fold desc="--- Endpoint Execution: Finishing (Response) -------">

	/**
	 * Returns the callback function that was passed to the execution context
	 * during its instantiation (if a callback was passed).
	 *
	 * @public
	 * @type {?function}
	 * @default null
	 */
	get callback() {

		const me = this;

		return me.getConfigValue( "callback", null );
	}

	set callback( /** ?function */ val ) {

		const me = this;

		me.setConfigValue( "callback", val );
	}

	/**
	 * Stores whether or not a callback was passed into the execution context
	 * during its instantiation.
	 *
	 * @public
	 * @readonly
	 * @type {boolean}
	 * @default false
	 */
	get hasCallback() {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		return TIPE( me.callback ) === "function";
	}

	/**
	 * Creates a new {@link Response.BaseResponse} to be, eventually, returned
	 * to the client.
	 *
	 * @private
	 * @param {?Object} [cfg=null] - An optional configuration object.
	 * @param {string} [cfg.responseType] - The response type to create; if this
	 *     value is not provided then the `defaultSuccessResponse` of the
	 *     endpoint will be created and returned.
	 * @returns {Promise<Response.BaseResponse>} The created response object.
	 */
	_createResponseObject( cfg ) {

		const me = this;

		// Dependencies
		const BB	= me.$dep( "bluebird" );
		const TIPE	= me.$dep( "tipe" );

		return BB.try( function () {

			return me.getRequest();

		} ).then( function ( request ) {

			// Param defaults
			if ( TIPE( cfg ) !== "object" ) {

				cfg = {};
			}

			if ( TIPE( cfg.responseType ) !== "string" ) {

				cfg.responseType = me.endpoint.defaultSuccessResponse;
			}

			// Add additional values to the constructor
			cfg.endpoint 			= me.endpoint;
			cfg.primaryModel 		= me.endpoint.model;
			cfg.executionContext	= me;
			cfg.request				= request;

			// Create response object
			return me.$spawn(
				"microservicesLib",
				"response/" + cfg.responseType, cfg
			);
		} );
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Serializes the {@link Response.BaseResponse} object using the default
	 * format ("JsonApiObject").
	 *
	 * @private
	 * @param {Response.BaseResponse} response - The unformatted response.
	 * @returns {Object} The formatted response.
	 */
	_formatResponse( response ) {

		return response.serialize( "JsonApiObject" );
	}

	/**
	 * Called whenever the endpoint execution operation succeeds.
	 *
	 * @private
	 * @param {Object} data - A plain object containing endpoint response data.
	 * @param {Object} pagination - A plain object containing pagination data.
	 * @returns {Promise} resolved with a {@link Response.SuccessResponse}
	 *     object.
	 */
	_succeed( data, pagination ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			// Create the response object
			return me._createResponseObject( {
				data       : data,
				pagination : pagination,
			} );

		} ).then( function ( responseObject ) {

			// Finish up
			return me._finish( responseObject );
		} );
	}

	/**
	 * Called whenever the endpoint execution operation fails.
	 *
	 * @private
	 * @param {Errors.BaseError} err - An error object (usually one that stems
	 *     from {@link Errors.BaseError} ).
	 * @returns {Promise} resolved with a {@link Response.ErrorResponse} object.
	 */
	_fail( err ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			// Wrap the error
			let finalError = new ERRORS.EndpointExecutionError(
				err,
				"Endpoint Execution Failed"
			);

			if ( err.statusCode !== undefined ) {

				finalError.statusCode = err.statusCode;
			}

			// Create the response object
			return me._createResponseObject( {
				responseType : "ErrorResponse",
				errorObject  : finalError,
			} );

		} ).then( function ( responseObject ) {

			// Finish up
			return me._finish( responseObject );
		} );
	}

	/**
	 * The last method called after endpoint execution which formats the
	 * response in a context-appropriate way (regardless of whether or not the
	 * endpoint execution was successful).
	 *
	 * @private
	 * @param {Response.BaseResponse} responseObject - A response object.
	 * @returns {Promise} resolved with a serialized response object.
	 */
	_finish( responseObject ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		// Format it
		let formattedResponse = me._formatResponse( responseObject );

		// If we have a callback, then we need to
		// call it with the formatted response.
		if ( me.hasCallback ) {

			me.$log(
				"debug",
				"endpoint.execution.callback",
				"Executing handler callback..."
			);

			me.callback( null, formattedResponse );
		}

		// ...and finish up by resolving the promise.
		me.$log(
			"info",
			"endpoint.execution.finished",
			"Endpoint execution complete."
		);

		return BB.resolve( formattedResponse );
	}

	// </editor-fold>

	// <editor-fold desc="--- Utility Methods --------------------------------">

	/**
	 * Creates a UUID to be used as a requestId, when a requestId could
	 * not be extracted from the environment. This method will, also,
	 * prepend the UUID with a marker so that it can be recognized.
	 *
	 * This method is called, exclusively, but the `requestId` getter.
	 *
	 * @private
	 * @returns {string} A valid UUID.
	 */
	_createFakeRequestId() {

		const me = this;

		// Dependencies
		const uuidUtils = me.$dep( "util/uuid" );

		// Although we want to generate a valid requestId (for realism),
		// we're going to set the first block of characters to something
		// that identifies the UUID as being unusual and, further, as
		// being generated by a execution context.
		return uuidUtils.generate( "0000" );
	}

	// </editor-fold>

	// <editor-fold desc="--- Abstract Methods -------------------------------">

	/**
	 * Prepares the endpoint with any execution-context-specific
	 * settings or configurations. This method is executed immediately
	 * after the constructor at the time that the context is resolved.
	 *
	 * @abstract
	 * @public
	 * @returns {void}
	 */
	prepareEndpoint() {

		// Do Nothing
	}

	// </editor-fold>
}

module.exports = BaseExecutionContext;
