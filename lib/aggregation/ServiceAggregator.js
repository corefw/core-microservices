/**
 * Defines the ServiceAggregator class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 5.1.34
 * @license See LICENSE.md for details about licensing.
 * @copyright 2019 C2C Schools, LLC
 */

"use strict";

const BaseGenerator	= require( "../util/BaseGenerator" );

/**
 * This class is used to aggregate services into a single API.
 *
 * @memberOf Aggregation
 * @extends Util.BaseGenerator
 */
class ServiceAggregator extends BaseGenerator {

	/**
	 * This is the main entry point for execution of the aggregator.
	 *
	 * @access public
	 * @returns {Promise} A promise that resolves after execution has completed.
	 */
	execute() {

		// Locals
		let me = this;
		let serviceData; let endpointData; let lambdaData;

		// Tell someone...
		me.$log( "notice", "start", "The Service Aggregator is starting up ..." );

		// Step 1. Load the aggregation config...
		return me._initAggregationConfig().then(

			function afterConfigInitialized() {

				// Step 2. Download the service metadata from S3
				return me.getServiceData();

			}

		).then(

			function afterServiceDataFetch( sd ) {

				// Persist the service data, for use later on..
				serviceData = sd;

				// Step 3. Resolve the endpoint info from the service data
				return me.buildEndpointData( serviceData );

			}

		).then(

			function afterEndpointDataResolution( ed ) {

				// Persist the endpoint data, for use later on..
				endpointData = ed;

				// Step 4. Fetch function info from AWS Lambda
				return me.getLambdaFunctions();

			}

		).then(

			function afterLambdaDataFetch( ld ) {

				// Persist the Lambda data, for use later on..
				lambdaData = ld;

				// Step 5. Build the CF Template
				return me.buildCloudFormationTemplate( endpointData, lambdaData );

			}

		).then(

			function afterTemplateGeneration( cfTemplate ) {

				// Step 6. Deploy the CF Template
				return me.deployCloudFormationTemplate( cfTemplate );

			}

		);

	}

	// <editor-fold desc="--- Aggregation Configuration Properties & Methods -----------------------------------------">

	/**
	 * Loads the aggregation configuration.  This method wraps the more generalized method, `_initConfig`,
	 * which loads the entire service configuration, by extracting the configuration settings that are relevant to
	 * the aggregation process.
	 *
	 * @private
	 * @throws Error if the configuration cannot be loaded or is invalid.
	 * @returns {Promise<Object>} A promise resolved with the aggregation configuration data.
	 */
	_initAggregationConfig() {

		// Locals
		let me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Load the config
		return me._initConfig().then(

			function afterConfigInit( fullConfig ) {

				if ( fullConfig.Aggregation === undefined ) {
					return me.$throw( "config.missing", "The provided configuration settings do not contain a 'Aggregation' property, which is required for service aggregation." );
				} else if( TIPE( fullConfig.Aggregation ) !== "object" ) {
					return me.$throw( "config.invalid", "The provided 'Aggregation' configuration settings are invalid or malformed." );
				} else {

					// Capture the deploy config
					let config = fullConfig.Aggregation;

					// Parse the configuration for variables
					config = me._parseObjectForVariables( config, {} );

					// Validate it ...
					me._validateConfig( config );

					// ... and Persist it ...
					me._aggregationConfig = config;

					// All done
					return config;

				}

			}

		);
	}

	/**
	 * Validates the aggregation configuration.
	 *
	 * @private
	 * @throws Error if the provided aggregation configuration is invalid.
	 * @param {Object} config - The aggregation configuration to be validated.
	 * @returns {void}
	 */
	_validateConfig( config ) {

		// Locals
		let me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Require that the aggregation config defines a 'MetaSourceBucket'
		if (
			config.MetaSourceBucket === undefined ||
			TIPE( config.MetaSourceBucket ) !== "object"
		) {

			me.$throw(
				"config.no.source",
				"ServiceAggregator requires a configuration information for the metadata source! (MetaSourceBucket)"
			);

		}

		// todo: add more validation, maybe...

	}


	/**
	 * The aggregation configuration settings, which are part of the main service configuration data.
	 *
	 * @access public
	 * @throws Error if called before _initAggregationConfig has been executed and it's returned promise has been resolved.
	 * @type {Object}
	 */
	get aggregationConfig() {

		// Locals
		let me = this;

		// Ensure we have the aggregation config cached...
		if( me._aggregationConfig === undefined || me._aggregationConfig === null ) {

			me.$throw(
				"config.not.loaded",
				"Attempted to read the aggregation configuration before it had been loaded; ensure that the ConfigManager has finished loading the configuration before attempting to access the 'aggregationConfig' property."
			);

		}

		// Return it..
		return me._aggregationConfig;

	}

	/**
	 * Loads configuration data from config/aggregation-config.yml and returns the
	 * "MetaSourceBucket" property as an object.
	 *
	 * @access public
	 * @type {Object}
	 */
	get sourceConfig() {
		return this.aggregationConfig.MetaSourceBucket;
	}

	/**
	 * The awsRegion of the MetaSourceBucket.
	 *
	 * @access public
	 * @type {?Object}
	 */
	get awsRegion() {
		return this.sourceConfig.awsRegion;
	}

	/**
	 * The root S3 path within the MetaSourceBucket.
	 *
	 * @access public
	 * @type {string}
	 */
	get sourceRootPath() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// The source root path SHOULD NOT be prefixed with a slash '/'
		if ( _.startsWith( me.sourceConfig.rootPath, "/" ) ) {

			me.sourceConfig.rootPath = me.sourceConfig.rootPath.substr( 1 );

		}

		// The source root path SHOULD be has a trailing '/'
		if ( !_.endsWith( me.sourceConfig.rootPath, "/" ) ) {

			me.sourceConfig.rootPath += "/";

		}

		return this.sourceConfig.rootPath;

	}

	/**
	 * The bucket name of the MetaSourceBucket.
	 *
	 * @access public
	 * @type {string}
	 */
	get sourceBucket() {

		return this.sourceConfig.bucket;

	}

	// </editor-fold>

	// <editor-fold desc="--- AWS S3 Wrappers ------------------------------------------------------------------------">

	/**
	 * The S3 client that is provided by the AWS SDK.
	 *
	 * @access public
	 * @type {AWS.S3}
	 */
	get s3() {

		// Locals
		let me = this;

		if ( me._s3client === undefined ) {

			// Dependencies
			let AWS = me.$dep( "aws" );

			// Init S3 client
			me._s3client = new AWS.S3(
				{
					apiVersion : "2006-03-01",
					region     : me.awsRegion,
				}
			);
		}

		return me._s3client;
	}

	/**
	 * Wrapper for the AWS SDK method 'listObjectsV2'.  This method will list all of the objects whose
	 * 'Key' is prefixed with `remoteAbsPath`.
	 *
	 * Important: Just like `AWS.S3.listObjectsV2`, this method will return a maximum of 1,000 results.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
	 * @param {string} bucket - The bucket to search for objects.
	 * @param {string} remoteAbsPath - The absolute, remote, path (key prefix) to search for S3 objects.
	 * @returns {Promise<Array>} A Promise resolved with an array list of subdirectories beneath the provided path.
	 */
	_getSubdirectories( bucket, remoteAbsPath ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Configure S3 Operation Params
		let params = {
			Bucket    : bucket,
			Prefix    : remoteAbsPath,
			MaxKeys   : 1000,
			Delimiter : "/",
		};

		// Defer to S3 SDK
		return me.s3.listObjectsV2( params ).promise().then(

			function afterS3DirList( results ) {

				let final = [];

				// Iterate over each subdirectory result
				_.each( results.CommonPrefixes, function ( object ) {

					// Remove the parent directory
					let relativePath = object.Prefix.replace( remoteAbsPath, "" );

					// Remove trailing slashes
					if ( _.endsWith( relativePath, "/" ) ) {

						relativePath = relativePath.substr( 0, relativePath.length - 1 );
					}

					// .. and capture the key
					final.push( relativePath );

				} );

				// All Done...
				return final;

			}

		).catch(

			function onS3ListError( err ) {

				me.$throw( "s3.listobjects.error", err, "S3 ListObjectsV2 Failed" );

			}

		);
	}

	/**
	 * Wrapper for the AWS SDK method 'getObject'.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
	 * @param {string} bucket - The bucket containing the target file/object.
	 * @param {string} remoteAbsPath - The absolute, remote, path of the file/object.
	 * @returns {Promise<Object>} Information about the requested S3 object.
	 */
	_getObject( bucket, remoteAbsPath ) {

		// Locals
		let me = this;

		// Configure S3 Operation Params
		let params = {
			Bucket : bucket,
			Key    : remoteAbsPath,
		};

		// Tell someone
		me.$log( "info", "s3.get-object.start", "... Downloading 's3://" + bucket + "/" + remoteAbsPath + "' ..." );

		// Defer to S3 SDK
		return me.s3.getObject( params ).promise().then(

			function afterS3DirList( results ) {

				// Tell someone
				me.$log( "info", "s3.get-object.finish", "... Download of 's3://" + bucket + "/" + remoteAbsPath + "' completed successfully!" );

				// Return the file contents
				return results.Body;

			}

		).catch(

			function onS3ListError() {

				// Tell someone
				me.$log( "warning", "s3.get-object.not-found", "Download of 's3://" + bucket + "/" + remoteAbsPath + "' failed, file not found!" );

				// Return NULL so that subsequent logic
				// can gracefully handle the failure.
				return null;

			}

		);

	}

	// </editor-fold>

	// <editor-fold desc="--- Service Metadata Fetching/Resolution ---------------------------------------------------">

	/**
	 * Fetches all relevant metadata for all services described within the MetaSourceBucket.
	 *
	 * @public
	 * @returns {Promise<Array>} a Promise that is resolved with an array of objects with
	 * each object containing the metadata for one service.
	 */
	getServiceData() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Tell someone
		me.$log( "info", "service.data.start", "Fetching the service metadata from AWS S3 ..." );

		// First, get the list of services...
		return this._getServiceList().then(

			function ( serviceNames ) {

				let promises = [];

				// Iterate over each service
				_.each( serviceNames, function ( serviceName ) {

					// Initialize the service description object
					let serviceData = {
						name: serviceName,
					};

					// Download the package.json file for the target service
					let p = me._getLatestServiceJson( serviceName, "package.json" ).then(

						function ( packageData ) {

							// Persist the package.json data
							serviceData.package = packageData;

							// Next, download the serverless.json file for the target service.
							return me._getLatestServiceJson( serviceName, "serverless.json" );

						}

					).then(

						function ( serverlessData ) {

							// Persist the serverless.json data
							serviceData.serverless = serverlessData;

							// Download the openapi.json file for the target service
							return me._getLatestServiceJson( serviceName, "openapi.json" );

						}

					).then(

						function ( openApiData ) {

							// Persist the openapi.json data
							serviceData.openApi = openApiData;

							// Done!
							return serviceData;

						}

					);

					promises.push( p );

				} );

				return Promise.all( promises );

			}

		);
	}

	/**
	 * Builds a list of service names based on subdirectories found in the MetaSourceBucket.
	 *
	 * @private
	 * @returns {Promise<Array>} a promise that is resolved with an array of strings where each string is the
	 * name of a service described within the MetaSourceBucket.
	 */
	_getServiceList() {

		// Locals
		let me = this;

		// Tell someone
		me.$log( "info", "service.list.start", "Fetching the service list from S3 at '" + me.sourceRootPath + "' ..." );

		// Begin..
		return me._getSubdirectories( this.sourceBucket, this.sourceRootPath );

	}

	/**
	 * Downloads a JSON file from within the `/latest` directory of a given, target, service in the MetaSourceBucket.
	 *
	 * @private
	 * @param {string} serviceName - The name of the service from which to download the file
	 * @param {string} filename - The name of the file to download
	 * @returns {Promise<Object | null>} The downloaded JSON file, as a simple JSON object.
	 */
	_getLatestServiceJson( serviceName, filename ) {

		// Locals
		let me = this;

		// Tell someone
		me.$log( "info", "service.file.start", "Downloading JSON file '" + filename + "' for service '" + serviceName + "' ..." );

		// Resolve absolute path
		let remoteAbsPath = me.sourceRootPath + serviceName + "/latest/" + filename;

		// Download the file
		return me._getObject( me.sourceBucket, remoteAbsPath ).then(

			function afterFileFetch( res ) {

				// If the file was not found, we'll return NULL so that
				// subsequent logic can handle the failure gracefully.
				if ( res === null ) {

					return null;
				}

				// Extract the file contents as a string
				let str = res.toString();

				// Parse the JSON
				return JSON.parse( str );

			}

		);

	}

	// </editor-fold>

	// <editor-fold desc="--- AWS Lambda Wrappers --------------------------------------------------------------------">

	/**
	 * The Lambda client that is provided by the AWS SDK.
	 *
	 * @access public
	 * @type {AWS.Lambda}
	 */
	get lambda() {

		// Locals
		let me = this;

		if ( me._lambdaClient === undefined ) {

			// Dependencies
			let AWS = me.$dep( "aws" );

			// Init S3 client
			me._lambdaClient = new AWS.Lambda(
				{
					apiVersion : "2015-03-31",
					region     : me.awsRegion,
				}
			);
		}

		return me._lambdaClient;

	}

	/**
	 * Wrapper for the AWS SDK method 'Lambda::listFunctions()'.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#listFunctions-property
	 * @param {?string} marker - An optional marker that is used for recursively downloading all of the Lambda functions
	 * within the target AWS account.  This value will be provided automatically by this function's recursion logic
	 * and should never be provided when calling this function otherwise.
	 * @returns {Promise<Array>} a Promise fullfilled with an array of Objects, each describing one AWS Lambda function.
	 */
	_listFunctions( marker ) {

		// Locals
		let me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Configure Lambda Operation Params
		let params = {
			MaxItems: 50,
		};

		// Apply Marker, if applicable, which fetches the
		// next set of Lambda function details, when provided.
		if ( marker !== undefined && marker !== null ) {
			params.Marker = marker;
		}

		// Tell someone...
		me.$log( "debug", "lambda.function.list.block.req", "... Fetching the details for [" + params.MaxItems + "] Lambda Functions ..." );

		// Defer to AWS SDK
		return me.lambda.listFunctions( params ).promise().then(

			function afterLambdaListFunctions( results ) {

				// Capture the details returned for the Lambda functions
				let details = results.Functions;

				// Tell someone...
				me.$log( "debug", "lambda.function.list.block.recv", "...... Received the details for [" + details.length + "] Lambda Functions ..." );

				// Check to see if we need to fetch the details for more Lambda functions
				if ( TIPE( results.NextMarker ) === "string" && results.NextMarker !== "" ) {

					// Yup, fetch more functions
					return me._listFunctions( results.NextMarker ).then(

						function ( moreData ) {

							// Merge the results of the next call with
							// the results from the previous call(s).
							return details.concat( moreData );

						}

					);

				} else {

					// Nope, all done...
					return details;

				}

			}

		).catch(

			function onS3ListError( err ) {
				me.$throw( "lambda.function.list.error", err, "Lambda listFunctions Failed" );
			}

		);

	}

	// </editor-fold>

	// <editor-fold desc="--- Lambda Function Interactions -----------------------------------------------------------">

	/**
	 * Downloads the details of all Core Framework powered Lambda functions.
	 *
	 * @public
	 * @returns {Promise<Array>} a Promise that resolves with an array of objects where each object describes one
	 * Lambda function.
	 */
	getLambdaFunctions() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );
		const TIPE = me.$dep( "tipe" );

		// Tell someone...
		me.$log( "info", "lambda.function.list.start", "Fetching function data from AWS Lambda ..." );

		// Download the details for ALL Lambda functions
		return me._listFunctions( null ).then(

			function ( res ) {

				// Initialize the final result object
				let final = {};

				// Count the number of valid, relevant, Lambda functions
				// that were found after filtering.
				let validFunctionCount = 0;

				// Give someone some stats..
				me.$count( res.length, "lambda.function.total", "Found {{value}} Lambda Functions (total)." );

				// Describe the next step
				me.$log( "info", "lambda.function.filter.start", "Filtering Lambda Functions" );

				// Iterate over each Lambda Function
				_.each( res, function ( lambdaFunc ) {

					// All Lambda Functions created through the Core Framework will
					// have certain environment variables that provide meta information
					// for the function.  This code block will filter Lambda functions
					// based on the existence and validity of a few of those variables.
					if ( lambdaFunc.Environment !== undefined &&
						lambdaFunc.Environment.Variables !== undefined &&
						lambdaFunc.Environment.Variables.COREFW_VERSION_HASH !== undefined &&
						TIPE( lambdaFunc.Environment.Variables.COREFW_VERSION_HASH ) === "string" &&
						lambdaFunc.Environment.Variables.COREFW_VERSION_HASH.length === 32 &&
						lambdaFunc.Environment.Variables.COREFW_SERVICE_BRANCH !== undefined &&
						lambdaFunc.Environment.Variables.COREFW_SERVICE_BRANCH === me.gitBranch ) {

						// Capture the "Version Hash"
						let versionHash = lambdaFunc.Environment.Variables.COREFW_VERSION_HASH.toLowerCase();

						// We'll store lambda function details in the final return
						// object based on their version hashes.
						final[ versionHash ] = lambdaFunc;

						// Count this function..
						validFunctionCount++;

					}

				} );

				// If zero valid Lambda functions were found, this tool cannot
				// do anything else, so we'll fail with an error.
				if ( validFunctionCount === 0 ) {

					me.$log( "critical", "lambda.function.list.empty", "No valid functions were found in Lambda; the aggregator cannot proceed!" );

				} else {

					// Give someone some stats..
					me.$count( validFunctionCount, "lambda.function.relevant", "Found {{value}} Relevant Lambda Functions." );

				}

				// Done
				return final;

			}

		);

	}

	// </editor-fold>

	// <editor-fold desc="--- Service API Aggregation ----------------------------------------------------------------">

	/**
	 * Returns aggregated information for all endpoints, from all services.
	 *
	 * @public
	 * @param {Object[]} serviceData - The metadata for all services, as compiled by `getServiceData()`.
	 * @returns {Object[]} an array of Objects, where each object contains metadata for one endpoint and is keyed
	 * using the API path for the endpoint.
	 */
	buildEndpointData( serviceData ) {

		// Locals
		let me = this;
		let ret = {};
		let totalEndpointsResolved = 0;

		// Deps
		const _ = me.$dep( "lodash" );
		const TIPE = me.$dep( "tipe" );

		// Tell someone...
		me.$log( "info", "endpoint.data.start", "Resolving Endpoint Data ..." );

		// Iterate over each service
		_.each( serviceData, function ( service ) {

			// Ensure this service has functions..
			if ( service.serverless !== undefined && service.serverless.functions !== undefined ) {

				// Iterate over each function
				_.each( service.serverless.functions, function ( func, shortFunctionName ) {

					// Resolve the function name
					let functionName;

					if ( func.name !== undefined && TIPE( func.name ) === "string" && func.name.length > 0 ) {

						functionName = func.name;

					} else {

						functionName = shortFunctionName;
					}

					// Filter out functions that do not meet the
					// minimum requirements for processing.
					if ( func.environment === undefined ) {

						me.$log( "warning", "endpoint.data.invalid.env", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; no environment variables defined!" );

					} else if ( func.environment.COREFW_VERSION_HASH === undefined ||
						TIPE( func.environment.COREFW_VERSION_HASH ) !== "string" ||
						func.environment.COREFW_VERSION_HASH.length !== 32 ) {

						me.$log( "warning", "endpoint.data.invalid.hash", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; missing or invalid COREFW_VERSION_HASH environment variable!" );

					} else if ( func.events === undefined ||
						TIPE( func.events ) !== "array" ||
						func.events === 0 ) {

						me.$log( "warning", "endpoint.data.invalid.events", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; no events are defined for this function." );

					} else {

						let validEventCount = 0;

						// Iterate over the function events; we're looking for
						// HTTP events that have a method, path, and use the
						// 'lambda-proxy' integration.
						_.each( func.events, function ( ev ) {

							if ( ev.http === undefined || TIPE( ev.http ) !== "object" ) {

								// Skip this event, silently...

							} else if ( ev.http.path === undefined || TIPE( ev.http.path ) !== "string" || ev.http.path.length === 0 ) {

								// All HTTP events should have a path, so, we
								// need to fire a warning if the path is missing...
								me.$log( "warning", "endpoint.data.invalid.path", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'path' is undefined or invalid." );

							} else if ( ev.http.method === undefined || TIPE( ev.http.method ) !== "string" || ev.http.method.length === 0 ) {

								// All HTTP events should have a method, so, we
								// need to fire a warning if the method is missing...
								me.$log( "warning", "endpoint.data.invalid.method", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'method' is undefined or invalid." );

							} else if ( ev.http.method !== "get" && ev.http.method !== "patch" &&
								ev.http.method !== "post" && ev.http.method !== "delete" ) {

								// If we encounter an unexpected 'method', we need to fire a warning...
								me.$log( "warning", "endpoint.data.unsupported.method", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'method' specified ('" + ev.http.method + "') is not supported." );

							} else if ( ev.http.integration === undefined || TIPE( ev.http.integration ) !== "string" || ev.http.integration.length === 0 ) {

								// All HTTP events should specify an 'integration', so, we
								// need to fire a warning if the integration is missing...
								me.$log( "warning", "endpoint.data.invalid.integration", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'integration' is undefined or invalid." );

							} else if ( ev.http.integration !== "lambda-proxy" ) {

								// This aggregator only supports the 'lambda-proxy' integration
								me.$log( "warning", "endpoint.data.unsupported.integration", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'integration' specified ('" + ev.http.integration + "') is not supported." );

							} else {

								// We have a good event; tell someone...
								me.$log( "info", "endpoint.data.resolved", "... Identified Path: '" + ev.http.method.toUpperCase() + " " + ev.http.path + "' -> '" + functionName + "'" );

								// Persist the path..
								if ( ret[ ev.http.path ] === undefined ) {

									ret[ ev.http.path ] = {};
								}
								ret[ ev.http.path ][ ev.http.method.toLowerCase() ] = {
									name        : functionName,
									shortName   : shortFunctionName,
									description : func.description,
									path        : ev.http.path,
									method      : ev.http.method.toLowerCase(),
									service     : service.name,
									versionHash : func.environment.COREFW_VERSION_HASH.toLowerCase(),
								};

								// A few counts..
								validEventCount++;
								totalEndpointsResolved++;

							}

						} );

						// Fire a warning for each function found that
						// does not have any valid HTTP events.
						if ( validEventCount === 0 ) {

							me.$log( "warning", "endpoint.data.events.none", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; no valid HTTP events were found." );
						}

					}

				} );

			}

		} );

		// Give someone some stats..
		me.$count( totalEndpointsResolved, "endpoints.resolved", "Resolved {{value}} endpoints" );

		// All done
		return ret;

	}

	/**
	 * This is one, of many, CloudFormation Template parts that will have variable values injected into it
	 * and will be composed with other CloudFormation Template parts during the generation of the final,
	 * aggregated, API, CloudFormation Template.
	 *
	 * Specifically, this CloudFormation Template part will be used as the basis for the overall template;
	 * it provides the outer-most properties of the template.
	 *
	 * @access private
	 * @type {string}
	 */
	get _cfTplOuter() {

		return {
			"AWSTemplateFormatVersion" : "2010-09-09",
			"Description"              : "API Facade Layer Generated by the Core-Microservices::ServiceAggregator.",
			"Resources"                : {},
			"Outputs"                  : {
				"ApiRootUrl": {
					"Description" : "The Root API URL",
					"Value"       : {
						"Fn::Join": [
							"",
							[
								"https://",
								{
									"Ref": "${apiRefName}",
								},
								".execute-api.us-east-1.",
								{
									"Ref": "AWS::URLSuffix",
								},
								"/${gitBranch}",
							],
						],
					},
				},
			},
		};
	}

	/**
	 * This is one, of many, CloudFormation Template parts that will have variable values injected into it
	 * and will be composed with other CloudFormation Template parts during the generation of the final,
	 * aggregated, API, CloudFormation Template.
	 *
	 * Specifically, this CloudFormation Template part will be used to define the AAG Rest API; it will
	 * be injected into the `_cfTplOuter` Template part within the `Resources` property.
	 *
	 * @access private
	 * @type {string}
	 */
	get _cfTplRestApi() {

		return {
			"Type"       : "AWS::ApiGateway::RestApi",
			"Properties" : {
				"Name"                  : "${apiName}",
				"EndpointConfiguration" : {
					"Types": [
						"EDGE",
					],
				},
			},
		};
	}

	/**
	 * This is one, of many, CloudFormation Template parts that will have variable values injected into it
	 * and will be composed with other CloudFormation Template parts during the generation of the final,
	 * aggregated, API, CloudFormation Template.
	 *
	 * Specifically, this CloudFormation Template part will be used to define each resource path that extends
	 * from the root path; it will be injected into the `_cfTplOuter` Template part within the `Resources` property.
	 *
	 * @access private
	 * @type {string}
	 */
	get _cfTplRootResource() {

		return {
			"Type"       : "AWS::ApiGateway::Resource",
			"Properties" : {
				"ParentId": {
					"Fn::GetAtt": [
						"${apiRefName}",
						"RootResourceId",
					],
				},
				"PathPart"  : "${pathPart}",
				"RestApiId" : {
					"Ref": "${apiRefName}",
				},
			},
		};
	}

	/**
	 * This is one, of many, CloudFormation Template parts that will have variable values injected into it
	 * and will be composed with other CloudFormation Template parts during the generation of the final,
	 * aggregated, API, CloudFormation Template.
	 *
	 * Specifically, this CloudFormation Template part will be used to define each resource path that extends
	 * from a root resource; it will be injected into the `_cfTplOuter` Template part within the `Resources` property.
	 *
	 * @access private
	 * @type {string}
	 */
	get _cfTplChildResource() {

		return {
			"Type"       : "AWS::ApiGateway::Resource",
			"Properties" : {
				"ParentId": {
					"Ref": "${parentRefName}",
				},
				"PathPart"  : "${pathPart}",
				"RestApiId" : {
					"Ref": "${apiRefName}",
				},
			},
		};
	}

	/**
	 * This is one, of many, CloudFormation Template parts that will have variable values injected into it
	 * and will be composed with other CloudFormation Template parts during the generation of the final,
	 * aggregated, API, CloudFormation Template.
	 *
	 * Specifically, this CloudFormation Template part will be used to define each endpoint (aka "Method");
	 * it will be injected into the `_cfTplOuter` Template part within the `Resources` property.
	 *
	 * @access private
	 * @type {string}
	 */
	get _cfTplMethod() {

		return {
			"Type"       : "AWS::ApiGateway::Method",
			"Properties" : {
				"HttpMethod"        : "${httpMethod}",
				"RequestParameters" : {},
				"ResourceId"        : {
					"Ref": "${resourceRefName}",
				},
				"RestApiId": {
					"Ref": "${apiRefName}",
				},
				"ApiKeyRequired"    : false,
				"AuthorizationType" : "NONE",
				"Integration"       : {
					"IntegrationHttpMethod" : "POST",
					"Type"                  : "AWS_PROXY",
					"Uri"                   : {
						"Fn::Join": [
							"",
							[
								"arn:",
								{
									"Ref": "AWS::Partition",
								},
								":apigateway:",
								{
									"Ref": "AWS::Region",
								},
								":lambda:path/2015-03-31/functions/",
								"${lambdaFunctionArn}",
								"/invocations",
							],
						],
					},
				},
				"MethodResponses": [],
			},
		};
	}

	/**
	 * This is one, of many, CloudFormation Template parts that will have variable values injected into it
	 * and will be composed with other CloudFormation Template parts during the generation of the final,
	 * aggregated, API, CloudFormation Template.
	 *
	 * Specifically, this CloudFormation Template part will be used to define the AAG deployment, which is used
	 * to publish "methods" to AAG "stages"; it will be injected into the `_cfTplOuter` Template part within the
	 * `Resources` property.
	 *
	 * @access private
	 * @type {string}
	 */
	get _cfTplDeployment() {

		return {
			"Type"       : "AWS::ApiGateway::Deployment",
			"Properties" : {
				"RestApiId": {
					"Ref": "${apiRefName}",
				},
				"StageName"   : "${gitBranch}",
				"Description" : "${description}",
			},
			"DependsOn": [],
		};
	}

	/**
	 * This is one, of many, CloudFormation Template parts that will have variable values injected into it
	 * and will be composed with other CloudFormation Template parts during the generation of the final,
	 * aggregated, API, CloudFormation Template.
	 *
	 * Specifically, this CloudFormation Template part will be used to grant AAG permission to invoke the
	 * attached Lambda functions; it will be injected into the `_cfTplOuter` Template part within the `Resources`
	 * property.
	 *
	 * @access private
	 * @type {string}
	 */
	get _cfTplPermission() {

		return {
			"Type"       : "AWS::Lambda::Permission",
			"Properties" : {
				"FunctionName" : "${lambdaFunctionArn}",
				"Action"       : "lambda:InvokeFunction",
				"Principal"    : {
					"Fn::Join": [
						"",
						[
							"apigateway.",
							{
								"Ref": "AWS::URLSuffix",
							},
						],
					],
				},
				"SourceArn": {
					"Fn::Join": [
						"",
						[
							"arn:",
							{
								"Ref": "AWS::Partition",
							},
							":execute-api:",
							{
								"Ref": "AWS::Region",
							},
							":",
							{
								"Ref": "AWS::AccountId",
							},
							":",
							{
								"Ref": "${apiRefName}",
							},
							"/*/*",
						],
					],
				},
			},
		};
	}

	/**
	 * Loads one of the CloudFormation Template parts, by name, and injects the values provided by `vars`,
	 * a simple key/value object.
	 *
	 * @private
	 * @param {string} partProperty - The name of the CloudFormation Template part to use.
	 * @param {Object} vars - A key/value object that defines variables to be injected into the template part.
	 * @returns {Object} The CloudFormation Template part, with variable values injected.
	 */
	_generateCfPart( partProperty, vars ) {

		// Locals
		let me = this;

		// Resolve the full property name for
		// the scaffold/template we'll be using.
		partProperty = "_cfTpl" + partProperty;

		// Fetch the template part..
		let tpl = me[ partProperty ];

		// Parse variables...
		return me._parseObjectForVariables( tpl, vars );

	}

	/**
	 * This is the main entry point for CloudFormation Template composition.  It will build a CloudFormation Template
	 * that will define the desired state of the aggregated/facade API.
	 *
	 * @public
	 * @param {Object[]} endpointData - Endpoint data, as built by the `buildEndpointData()` method.
	 * @param {Object[]} lambdaData - Lambda function data, as built by the `getLambdaFunctions()` method.
	 * @returns {Object} The final, full, CloudFormation Template, as an Object.
	 */
	buildCloudFormationTemplate( endpointData, lambdaData ) {

		// Locals
		let me = this;
		let cfTemplate; let methodRefNames;

		// Tell someone
		me.$log( "info", "cf.tpl.start", "Generating the CloudFormation Template ..." );

		// Define global cf template variables
		let vars = {
			apiName    : me.aggregationConfig.FacadeApi.name,
			apiRefName : "ApiGatewayRestApi",
		};

		// Create the outer scaffold
		cfTemplate = me._generateCfPart( "Outer", vars );

		// Add the REST API Resource
		cfTemplate.Resources[ vars.apiRefName ] = me._generateCfPart( "RestApi", vars );

		// Add the AAG Resources
		me._buildAagResourcesForCf( endpointData, cfTemplate, vars );

		// Add the AAG Methods
		methodRefNames = me._buildAagMethodsForCf( endpointData, lambdaData, cfTemplate, vars );

		// Add the AAG->Lambda Permission Mappings
		me._buildLambdaPermsForCf( lambdaData, cfTemplate, vars );

		// Add the AAG Deployment
		me._buildAagDeploymentForCf( methodRefNames, cfTemplate, vars );

		// Done..
		return cfTemplate;

	}

	/**
	 * One, of many, helper functions for the `buildCloudFormationTemplate()` method, which builds a specific
	 * part of the template.
	 *
	 * Specifically, this method will append the AAG Resource entities to the CloudFormation Template.
	 *
	 * @private
	 * @param {Object[]} endpointData - Endpoint data, as built by the `buildEndpointData()` method.
	 * @param {Object} cfTemplate - The CloudFormation Template object, which will be modified "by reference" by this
	 * method.
	 * @param {Object} globalCfVars - A key/value object containing variables and values that are universally useful
	 * to all portions of the CloudFormation template.
	 * @returns {void} nothing; this method updates the `cfTemplate` object, which is provided as a parameter, "by
	 * reference".
	 */
	_buildAagResourcesForCf( endpointData, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Iterate over each resource path
		_.each( endpointData, function ( eps, path ) {

			// Break the path down into parts..
			let pathParts = path.split( "/" );
			let parentPath = "";
			let parentRefName = null;

			// .. and iterate over each part ..
			_.each( pathParts, function ( part, depth ) {

				let refName; let fullPath; let tplName;

				// Build the full path & acquire
				// the appropriate template.
				if ( depth === 0 ) {

					tplName = "RootResource";
					fullPath = part;

				} else {

					tplName = "ChildResource";
					fullPath = parentPath + "/" + part;
				}

				// Resolve the CF Reference Name for this
				// AAG path/resource..
				refName = me._convPathToCfrn( fullPath );

				// We can skip this part if the resource
				// has already been created...
				if ( cfTemplate.Resources[ refName ] === undefined ) {

					let vars = Object.assign( {}, globalCfVars, {
						parentRefName : parentRefName,
						pathPart      : part,
					} );

					cfTemplate.Resources[ refName ] = me._generateCfPart( tplName, vars );
				}

				// Our full path will be the parent path, and our
				// reference name will be the parent ref for the
				// next resource:
				parentPath = fullPath;
				parentRefName = refName;

			} );

		} );

	}

	/**
	 * One, of many, helper functions for the `buildCloudFormationTemplate()` method, which builds a specific
	 * part of the template.
	 *
	 * Specifically, this method will append the AAG Method entities (aka "endpoints") to the CloudFormation Template.
	 *
	 * @private
	 * @param {Object[]} endpointData - Endpoint data, as built by the `buildEndpointData()` method.
	 * @param {Object[]} lambdaData - Lambda function data, as built by the `getLambdaFunctions()` method.
	 * @param {Object} cfTemplate - The CloudFormation Template object, which will be modified "by reference" by this
	 * method.
	 * @param {Object} globalCfVars - A key/value object containing variables and values that are universally useful
	 * to all portions of the CloudFormation template.
	 * @returns {void} nothing; this method updates the `cfTemplate` object, which is provided as a parameter, "by
	 * reference".
	 */
	_buildAagMethodsForCf( endpointData, lambdaData, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;
		let methodRefNames = [];

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Iterate over each resource path
		_.each( endpointData, function ( endpoints, path ) {

			// .. and over each endpoint
			_.each( endpoints, function ( endpoint, httpMethod ) {

				// Resolve the ref name of the parent resource
				let resourceRefName = me._convPathToCfrn( path );

				// Resolve the method ref name
				let refName = me._convMethodToCfrn( path, httpMethod );

				// Resolve the version hash
				let versionHash = endpoint.versionHash;

				// Find the ARN/name for the lambda function
				if ( lambdaData[ versionHash ] === undefined ) {

					me.$log( "warning", "cf.tpl.map.error.missing", "Skipping method mapping for '" + path + "'; could not find a valid Lambda function (using 'versionHash')." );

				} else {

					let lambdaFunctionArn = lambdaData[ versionHash ].FunctionArn;
					let lambdaFunctionName = lambdaData[ versionHash ].FunctionName;

					let vars = Object.assign( {}, globalCfVars, {
						httpMethod: httpMethod.toUpperCase(),
						resourceRefName,
						lambdaFunctionArn,
						lambdaFunctionName,
					} );

					// Add the method
					cfTemplate.Resources[ refName ] = me._generateCfPart( "Method", vars );

					// Capture the reference name
					methodRefNames.push( refName );

				}

			} );

		} );

		// Done, return the method reference names
		return methodRefNames;

	}

	/**
	 * One, of many, helper functions for the `buildCloudFormationTemplate()` method, which builds a specific
	 * part of the template.
	 *
	 * Specifically, this method will append the Lambda Permission entities to the CloudFormation Template, which
	 * grants AAG permission to invoke the various Lambda functions, as needed.
	 *
	 * @private
	 * @param {Object[]} lambdaData - Lambda function data, as built by the `getLambdaFunctions()` method.
	 * @param {Object} cfTemplate - The CloudFormation Template object, which will be modified "by reference" by this
	 * method.
	 * @param {Object} globalCfVars - A key/value object containing variables and values that are universally useful
	 * to all portions of the CloudFormation template.
	 * @returns {void} nothing; this method updates the `cfTemplate` object, which is provided as a parameter, "by
	 * reference".
	 */
	_buildLambdaPermsForCf( lambdaData, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Iterate over each lambda function
		_.each( lambdaData, function ( func ) {

			// Resolve Ref Name
			let refName = me._convLambdaFnToCfrn( func.FunctionName );

			// Get some variables from the Lambda data
			let lambdaFunctionArn = func.FunctionArn;
			let lambdaFunctionName = func.FunctionName;

			// Merge the global vars
			let vars = Object.assign( {}, globalCfVars, {
				lambdaFunctionArn,
				lambdaFunctionName,
			} );

			// Add the permission block
			cfTemplate.Resources[ refName ] = me._generateCfPart( "Permission", vars );
		} );
	}

	/**
	 * One, of many, helper functions for the `buildCloudFormationTemplate()` method, which builds a specific
	 * part of the template.
	 *
	 * Specifically, this method will append an AAG Deployment entity to the CloudFormation Template, which will
	 * publish the AAG Resource entities and AAG Method entities to an AAG API Stage.
	 *
	 * @private
	 * @param {string[]} methodRefNames - An array of strings containing the "reference names" for all of the AAG
	 * Method entities within the CloudFormation Template.
	 * @param {Object} cfTemplate - The CloudFormation Template object, which will be modified "by reference" by this
	 * method.
	 * @param {Object} globalCfVars - A key/value object containing variables and values that are universally useful
	 * to all portions of the CloudFormation template.
	 * @returns {void} nothing; this method updates the `cfTemplate` object, which is provided as a parameter, "by
	 * reference".
	 */
	_buildAagDeploymentForCf( methodRefNames, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;
		let tpl;

		// Dependencies
		const MOMENT = me.$dep( "moment" );

		// Resolve a deployment reference name
		let refName = me._formatCfName( "AagDeployment", MOMENT().format( "YYYY-MM-DD-HH-mm-s-SSS" ) );

		// Merge the global vars
		let vars = Object.assign( {}, globalCfVars, {
			description: "Generated by the CoreMicroservices::ServiceAggregator on " + MOMENT().format(),
		} );

		// Add the permission block
		tpl = me._generateCfPart( "Deployment", vars );

		// Add the DependsOn block
		tpl.DependsOn = methodRefNames;

		// Update the template byRef
		cfTemplate.Resources[ refName ] = tpl;
	}

	/**
	 * A utility function that will convert any string into format that is appropriate for inclusion within
	 * a CloudFormation Template.
	 *
	 * @private
	 * @param {?string} prefix - An optional prefix to prepend to the result before returning.
	 * @param {string} str - The string to format.
	 * @param {?string} [suffix=null] - An optional suffix to append to the result before returning.
	 * @returns {string} The final, formatted, string
	 */
	_formatCfName( prefix, str, suffix ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Param Coercion
		if ( prefix === null ) {
			prefix = "";
		}
		if ( suffix === null || suffix === undefined ) {
			suffix = "";
		}

		// Remove Unsupported Characters
		str = str.replace( /\}/ig, " Var " );
		str = str.replace( /[^a-z0-9]/ig, " " );

		// Title Case..
		str = _.startCase( str );

		// Remove the white space
		str = str.replace( /\s+/ig, "" );

		// Done..
		return prefix + str + suffix;

	}

	/**
	 * A utility method that generates a CloudFormation reference name for a given AAG Resource path.
	 *
	 * @private
	 * @param {string} path - The path to generate a name for.
	 * @returns {string} The reference name for the provided path.
	 */
	_convPathToCfrn( path ) {

		return this._formatCfName( "AagResource", path, null );
	}

	/**
	 * A utility method that generates a CloudFormation reference name for a given AAG Method path and HTTP method.
	 *
	 * @private
	 * @param {string} path - The path to generate a name for.
	 * @param {string} httpMethod - The HTTP method used by the AAG Method for the endpoint.
	 * @returns {string} The reference name for the provided path and HTTP method.
	 */
	_convMethodToCfrn( path, httpMethod ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		// Defer to _formatCfName
		return me._formatCfName( "AagMethod", path, _.capitalize( httpMethod ) );

	}

	/**
	 * A utility method that generates a CloudFormation reference name for the permissions block of a given
	 * Lambda function.
	 *
	 * @private
	 * @param {string} functionName - The name of a Lambda function.
	 * @returns {string} The reference name for the permission block of the provided Lambda function.
	 */
	_convLambdaFnToCfrn( functionName ) {

		return this._formatCfName( null, functionName, "AagPerms" );
	}

	// </editor-fold>

	// <editor-fold desc="--- AWS CloudFormation Wrappers ------------------------------------------------------------">

	/**
	 * The CloudFormation client that is provided by the AWS SDK.
	 *
	 * @access public
	 * @type {AWS.CloudFormation}
	 */
	get cloudFormation() {

		// Locals
		let me = this;

		if ( me._cloudFormationClient === undefined ) {

			// Dependencies
			let AWS = me.$dep( "aws" );

			// Init S3 client
			me._cloudFormationClient = new AWS.CloudFormation(
				{
					apiVersion : "2010-05-15",
					region     : me.awsRegion,
				}
			);

		}

		return me._cloudFormationClient;
	}

	/**
	 * Wrapper for the AWS SDK method 'CloudFormation::createStack()'.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
	 * @throws Error If the stack does not create successfully.
	 * @param {Object} cfTemplate - The CloudFormation Template object, as created by `buildCloudFormationTemplate()`
	 * @returns {Promise<string>} A promise resolved with the new CloudFormation Stack's unique id.
	 */
	_createStack( cfTemplate ) {

		// Locals
		let me = this;
		let stackName = me.aggregationConfig.FacadeApi.cfStackName;

		// Configure CF Operation Params
		let params = {
			StackName : stackName,
			Tags      : [
				{
					Key   : "COREFW_IS_FACADE",
					Value : "yes",
				},
			],
			TemplateBody: JSON.stringify( cfTemplate ),
		};

		// Tell someone...
		me.$log( "info", "cf.deploy.create.start", "Creating CloudFormation Stack '" + stackName + "' ..." );

		// Defer to AWS SDK
		return me.cloudFormation.createStack( params ).promise().then(

			function afterCfStackCreate( results ) {

				let stackId = results.StackId;

				// Tell someone that the stack is being created
				me.$log( "info", "cf.deploy.create.pending", "... The CloudFormation Stack is being created; waiting for success ..." );

				// Wait for the create operation to complete
				return me._waitForStackStates( stackId,
					[ "CREATE_COMPLETE", "CREATE_FAILED", "ROLLBACK_COMPLETE", "ROLLBACK_FAILED" ],
					5, 30
				).then(

					function onCFStateReached( stackState ) {

						if ( stackState !== "CREATE_COMPLETE" ) {

							// We hit a snag..
							me.$throw( "cf.deploy.create.failed", "CF Create Failed; unexpected Stack State returned: '" + stackState + "'" );

						}

						// Tell someone we've finished
						me.$log( "info", "cf.deploy.create.success", "... The CloudFormation Stack has been created successfully!" );

						// All done..
						return stackId;

					}

				);

			}

		).catch(

			function onCFCreateStackError( err ) {

				me.$throw( "cf.deploy.create.error", err, "CloudFormation CreateStack Failed" );
			}

		);
	}

	/**
	 * Wrapper for the AWS SDK method 'CloudFormation::updateStack()'.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#updateStack-property
	 * @throws Error If the stack does not create successfully.
	 * @param {string} stackId - The unique id of the CloudFormation Stack being updated.
	 * @param {Object} cfTemplate - The CloudFormation Template object, as created by `buildCloudFormationTemplate()`
	 * @returns {Promise<string>} A promise resolved with the CloudFormation Stack's unique id.
	 */
	_updateStack( stackId, cfTemplate ) {

		// Locals
		let me = this;

		// Configure CF Operation Params
		let params = {
			StackName    : stackId,
			TemplateBody : JSON.stringify( cfTemplate ),
		};

		// Tell someone...
		me.$log( "info", "cf.deploy.update.start", "Updating CloudFormation Stack '" + stackId + "' ..." );

		// Defer to AWS SDK
		return me.cloudFormation.updateStack( params ).promise().then(

			function afterCfStackUpdate() {

				// Tell someone that the stack is being updated
				me.$log( "info", "cf.deploy.update.pending", "... The CloudFormation Stack is updating; waiting for success ..." );

				// Wait for the update
				return me._waitForStackStates( stackId,
					[ "UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE", "ROLLBACK_COMPLETE", "ROLLBACK_FAILED", "UPDATE_ROLLBACK_FAILED" ],
					5, 30
				).then(

					function onCFStateReached( stackState ) {

						if ( stackState !== "UPDATE_COMPLETE" ) {

							// We hit a snag..
							me.$throw( "cf.deploy.update.failed", "CF Update Failed; unexpected Stack State returned: '" + stackState + "'" );

						}

						// Tell someone we've finished
						me.$log( "info", "cf.deploy.update.success", "... The CloudFormation Stack has updated successfully!" );

						// All done..
						return stackId;

					}

				);
			}

		).catch(

			function onCFUpdateStackError( err ) {

				me.$throw( "cf.deploy.update.error", err, "CloudFormation UpdateStack Failed" );

			}

		);
	}

	/**
	 * Wrapper for the AWS SDK method 'CloudFormation::describeStacks()'.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#createStack-property
	 * @param {?string} [stackName=null] - If provided, then CloudFormation will be queried for a specific stack,
	 * otherwise, all CloudFormation stacks will be returned.
	 * @returns {Promise<Object[]>} A promise which is resolved with an array of objects, where each object describes
	 * a single CloudFormation Stack.  If the `stackName` parameter is provided, then this array can only have 0 or 1
	 * elements. If no stacks match the query (whether a name is provided, or not), then an empty array will be
	 * returned.
	 */
	_describeStacks( stackName ) {

		// Locals
		let me = this;

		// Configure CF Operation Params
		let params = {};

		// Apply Stack Name Filter
		if ( stackName !== undefined && stackName !== null ) {
			params.StackName = stackName;
		}

		// Defer to AWS SDK
		return me.cloudFormation.describeStacks( params ).promise().then(

			function afterCfStackDescribe( results ) {

				return results.Stacks;

			}

		).catch(

			function onCFDescribeStackError() {

				return [];

			}

		);
	}

	/**
	 * Monitors a CloudFormation Stack until it reaches one of the provided state strings.
	 *
	 * @private
	 * @throws Error if the maximum number of retries is reached before the CloudFormation Stack reaches one of
	 * the conditional states (`states`).
	 * @param {string} stackId - The unique id of the CloudFormation Stack to wait for.
	 * @param {string[]} states - One or more state strings to wait for.
	 * @param {number} [retryIntervalSec=10] - The number of seconds to wait before the first state check and between
	 * each, subsequent, state check.
	 * @param {number} [maxRetries=30] - The maximum number of state checks to do before giving up.
	 * @param {number} [currentAttempt=1] - The number of times the state has been checked, plus, prior to the
	 * current state check.  Callers should not pass this value as it is used, internally, by this method for
	 * incremental checking.
	 * @returns {Promise<string>} A promise resolved with the state of the CloudFormation stack after one of
	 * the conditional states (`states`) has been met.
	 */
	_waitForStackStates( stackId, states, retryIntervalSec, maxRetries, currentAttempt ) {

		// Locals
		let me = this;
		let retryIntervalMs = retryIntervalSec * 1000;

		// Dependencies
		const bb = me.$dep( "bluebird" );
		const _ = me.$dep( "lodash" );

		// Param Coercion
		if ( retryIntervalSec === undefined || retryIntervalSec === null ) {
			retryIntervalSec = 10;
		}
		if ( maxRetries === undefined || maxRetries === null ) {
			maxRetries = 30;
		}
		if ( currentAttempt === undefined || currentAttempt === null ) {
			currentAttempt = 1;
		}

		// Iterate
		return bb.delay( retryIntervalMs ).then(

			function onIteration() {

				return me._describeStacks( stackId ).then(

					function afterDescribe( res ) {

						// If one of the state conditions is met, return..
						if ( _.includes( states, res[ 0 ].StackStatus ) ) {

							// Done!
							return res[ 0 ].StackStatus;

						} else {

							// Error out if we've exceeded the maximum number of retries..
							if ( currentAttempt >= maxRetries ) {
								me.$throw( "cf.stack.wait.timeout", "Timeout while waiting for Stack Status" );
							}

							// Otherwise, try again..
							me.$log( "info", "cf.stack.wait.more", "... Still Waiting ..." );

							return me._waitForStackStates(
								stackId, states, retryIntervalSec, maxRetries, currentAttempt + 1
							);

						}

					}

				);

			}

		);

	}

	// </editor-fold>

	// <editor-fold desc="--- CloudFormation Deployment --------------------------------------------------------------">

	/**
	 * The name of the CloudFormation Stack that the Service Aggregator will deploy to.
	 * This setting is defined in `aggregation-config.yml` as `FacadeApi.cfStackName`.
	 *
	 * @access public
	 * @type {string}
	 */
	get cfStackName() {

		let me = this;

		if ( me.aggregationConfig.FacadeApi.cfStackName === undefined ||
			me.aggregationConfig.FacadeApi.cfStackName === null ) {

			me.$throw( "cf.deploy.stack.undefined", "The CloudFormation Stack Name (aggregation-config.yml:FacadeApi.cfStackName) is undefined or invalid." );

		}

		return me.aggregationConfig.FacadeApi.cfStackName;

	}

	/**
	 * This is the main entry point for CloudFront Deployment.  This method deploys a CloudFormation template to AWS,
	 * creating or updating the stack as appropriate.
	 *
	 * @public
	 * @throws Error If the stack does not create or update successfully.
	 * @param {Object} cfTemplate - The CloudFormation Template object, usually created by `buildCloudFormationTemplate()`
	 * @returns {Promise<string>} A promise resolved with the CloudFormation Stack's unique id.
	 */
	deployCloudFormationTemplate( cfTemplate ) {

		// Locals
		let me = this;
		let stackName = me.cfStackName;

		// Tell someone
		me.$log( "info", "cf.deploy.stack.init", "Deploying CloudFormation Stack: '" + stackName + "'" );

		// First, we need to check to see if the stack already exists..
		return me._describeStacks( stackName ).then(

			function afterDescribeStack( res ) {

				if ( res.length === 0 ) {

					// Create a new stack
					return me._createStack( cfTemplate );

				} else {

					// We should have only received exactly 1 stack in the response..
					if ( res.length > 1 ) {
						me.$throw( "cf.deploy.stack.count", "CloudFormation returned more than [1] stack in the DescribeStacks call, which should never happen!" );
					}

					// Extract the full stack id from the
					// describeStacks call...
					let stackId = res[ 0 ].StackId;

					// .. and use that ID to update the stack
					return me._updateStack( stackId, cfTemplate );

				}

			}

		);
	}

	// </editor-fold>

}

module.exports = ServiceAggregator;
