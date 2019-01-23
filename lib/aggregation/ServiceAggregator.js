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
	 * @returns {Promise}
	 */
	execute() {

		// Locals
		let me = this;
		let serviceData, endpointData, lambdaData;

		// Deps
		const _ = me.$dep("lodash");
		const bb = me.$dep("bluebird");

		// Tell someone...
		me.$log( "notice", "start", "The Service Aggregator is starting up ...");

		// Step 1. Fetch the metadata from the S3 source...
		return me.getServiceData().then(

			function afterServiceDataFetch( sd ) {

				serviceData = sd;
				return me.buildEndpointData( serviceData );

			}

		).then(

			function afterEndpointDataResolution( ed ) {

				// Step 2. Fetch function info from AWS Lambda
				endpointData = ed;
				return me.getLambdaFunctions();

			}

		).then(

			function afterLambdaDataFetch( ld ) {

				// Step 3. Build the CF Template
				lambdaData = ld;
				return me.buildCloudFormationTemplate( endpointData, lambdaData );

			}

		).then(

			function afterTemplateGeneration( cfTemplate ) {

				// Step 4. Deploy the CF Template
				return me.deployCloudFormationTemplate( cfTemplate );

			}

		)


	}


	//<editor-fold desc="--- Config Loading (aggregation-config.yml) --------------">




	/**
	 * Resolves the expected, absolute, path for the config/aggregation-config.yml file.
	 *
	 * @access public
	 * @returns {string}
	 */
	get aggregationConfigPath() {

		// Locals
		let me = this;

		// Deps
		const PATH = me.$dep("path");

		// Resolve the path and return it
		return PATH.join( me.serviceRootPath, "config/aggregation-config.yml" );

	}

	/**
	 * Loads configuration data from config/aggregation-config.yml and returns the
	 * full configuration as an object.
	 *
	 * @access public
	 * @throws Error if the aggregation-config.yml file cannot be found or read.
	 * @returns {object}
	 */
	get aggregationConfig() {

		// Locals
		let me = this;
		let config;

		// Deps
		const TIPE = me.$dep("tipe");

		// Caching...
		if( me._aggregationConfig !== undefined ) {
			return me._aggregationConfig;
		}

		// Read aggregation-config.yml
		try {
			config = me.loadYamlFile( me.aggregationConfigPath );
		} catch( err ) {
			me.$throw("agg.config.syntax.error", err, "Could not read 'config/aggregation-config.yml'" );
		}

		// Replace variables in config data
		config = me._parseObjectForVariables( config, {} );

		// Cache the config
		me._aggregationConfig = config;

		// .. and return it..
		return config;

	}

	get sourceConfig() {

		return this.aggregationConfig.MetaSourceBucket;

	}

	get awsRegion() {
		return this.sourceConfig.awsRegion;
	}

	get sourceRootPath() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// The source root path SHOULD NOT be prefixed with a slash '/'
		if( _.startsWith( me.sourceConfig.rootPath, "/" ) ) {
			me.sourceConfig.rootPath = me.sourceConfig.rootPath.substr(1);
		}

		// The source root path SHOULD be has a trailing '/'
		if( !_.endsWith( me.sourceConfig.rootPath, "/" ) ) {
			me.sourceConfig.rootPath += "/";
		}

		return this.sourceConfig.rootPath;

	}

	get sourceBucket() {
		return this.sourceConfig.bucket;
	}

	//</editor-fold>


	// <editor-fold desc="--- AWS S3 Wrappers ------------------------------------------------------------------------">


	/**
	 * The S3 client that is provided by the AWS SDK.
	 *
	 * @property s3
	 * @access public
	 * @returns {AWS.S3}
	 */
	get s3() {

		// Locals
		let me = this;

		if( me._s3client === undefined ) {

			// Dependencies
			let AWS = me.$dep( "aws" );

			// Init S3 client
			me._s3client = new AWS.S3(
				{
					apiVersion: "2006-03-01",
					region: me.awsRegion
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
	 * @param {string} bucket The bucket to search for objects.
	 * @param {string} remoteAbsPath The absolute, remote, path (key prefix) to search for S3 objects.
	 * @returns {Promise<array>}
	 */
	_getSubdirectories( bucket, remoteAbsPath ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Configure S3 Operation Params
		let params = {
			Bucket: bucket,
			Prefix: remoteAbsPath,
			MaxKeys: 1000,
			Delimiter: "/"
		};

		// Defer to S3 SDK
		return me.s3.listObjectsV2( params ).promise().then(

			function afterS3DirList( results ) {

				let final = [];

				// Iterate over each subdirectory result
				_.each( results.CommonPrefixes, function( object ) {

					// Remove the parent directory
					let relativePath = object.Prefix.replace( remoteAbsPath, "" );

					// Remove trailing slashes
					if( _.endsWith( relativePath, "/" ) ) {
						relativePath = relativePath.substr( 0, relativePath.length - 1 );
					}

					// .. and capture the key
					final.push( relativePath );

				});

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
	 * @param {string} bucket The bucket containing the target file/object.
	 * @param {string} remoteAbsPath The absolute, remote, path of the file/object.
	 * @returns {Promise}
	 */
	_getObject( bucket, remoteAbsPath ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Configure S3 Operation Params
		let params = {
			Bucket: bucket,
			Key: remoteAbsPath
		};

		// Tell someone
		me.$log( "info", "s3.get-object.start", "... Downloading 's3://" + bucket + "/" + remoteAbsPath + "' ...");

		// Defer to S3 SDK
		return me.s3.getObject( params ).promise().then(

			function afterS3DirList( results ) {

				// Tell someone
				me.$log( "info", "s3.get-object.finish", "... Download of 's3://" + bucket + "/" + remoteAbsPath + "' completed successfully!");

				// Return the file contents
				return results.Body;

			}

		).catch(

			function onS3ListError( err ) {

				// Tell someone
				me.$log( "warning", "s3.get-object.not-found", "Download of 's3://" + bucket + "/" + remoteAbsPath + "' failed, file not found!");

				// Return NULL so that subsequent logic
				// can gracefully handle the failure.
				return null;

			}

		);

	}



	// </editor-fold>

	// <editor-fold desc="--- Service Metadata Fetching/Resolution ---------------------------------------------------">



	getServiceData() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Tell someone
		me.$log( "info", "service.data.start", "Fetching the service metadata from AWS S3 ...");

		// Begin
		return this._getServiceList().then(

			function( serviceNames ) {

				let promises = [];

				_.each( serviceNames, function( serviceName ) {

					let serviceData = {
						name: serviceName
					};

					let p = me._getLatestServiceJson( serviceName, "package.json" ).then(

						function( packageData ) {

							serviceData.package = packageData;
							return me._getLatestServiceJson( serviceName, "serverless.json" );

						}

					).then(

						function( serverlessData ) {

							serviceData.serverless = serverlessData;
							return me._getLatestServiceJson( serviceName, "openapi.json" );

						}

					).then(

						function( openApiData ) {

							serviceData.openApi = openApiData;
							return serviceData;

						}

					);

					promises.push( p );

				});

				return Promise.all( promises );

			}


		);

	}

	_getServiceList() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Tell someone
		me.$log( "info", "service.list.start", "Fetching the service list from S3 at '" + me.sourceRootPath + "' ...");

		// Begin..
		return me._getSubdirectories( this.sourceBucket, this.sourceRootPath );

	}

	_getLatestServiceJson( serviceName, filename ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Tell someone
		me.$log( "info", "service.file.start", "Downloading JSON file '" + filename + "' for service '" + serviceName + "' ...");

		// Resolve absolute path
		let remoteAbsPath = me.sourceRootPath + serviceName + "/latest/" + filename;

		return me._getObject( me.sourceBucket, remoteAbsPath ).then(

			function afterFileFetch( res ) {

				// If the file was not found, we'll return NULL so that
				// subsequent logic can handle the failure gracefully.
				if( res === null ) {
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
	 * @property lambda
	 * @access public
	 * @returns {AWS.Lambda}
	 */
	get lambda() {

		// Locals
		let me = this;

		if( me._lambdaClient === undefined ) {

			// Dependencies
			let AWS = me.$dep( "aws" );

			// Init S3 client
			me._lambdaClient = new AWS.Lambda(
				{
					apiVersion: "2015-03-31",
					region: me.awsRegion
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
	 * @returns {Promise<array>}
	 */
	_listFunctions( marker ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");
		const TIPE = me.$dep("tipe");

		// Configure Lambda Operation Params
		let params = {
			MaxItems: 50
		};

		// Apply Marker
		if( marker !== undefined && marker !== null ) {
			params.Marker = marker;
		}

		// Tell someone...
		me.$log( "info", "lambda.function.list.block.req", "... Fetching the details for [" + params.MaxItems + "] Lambda Functions ...");


		// Defer to AWS SDK
		return me.lambda.listFunctions( params ).promise().then(

			function afterLambdaListFunctions( results ) {

				let details = results.Functions;

				me.$log( "info", "lambda.function.list.block.recv", "...... Received the details for [" + details.length + "] Lambda Functions ...");

				if( TIPE( results.NextMarker ) === "string" && results.NextMarker !== "" ) {

					return me._listFunctions( results.NextMarker ).then(

						function( moreData ) {

							return details.concat( moreData );

						}

					)

				} else {
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



	getLambdaFunctions() {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");
		const TIPE = me.$dep("tipe");

		// Tell someone...
		me.$log( "info", "lambda.function.list.start", "Fetching function data from AWS Lambda ...");

		return me._listFunctions( null ).then(

			function( res ) {

				// The final results..
				let final = {};
				let validFunctionCount = 0;

				// Give someone some stats..
				me.$count( res.length, "lambda.function.total", "Found {{value}} Lambda Functions (total).");

				// Describe the next step
				me.$log( "info", "lambda.function.filter.start", "Filtering Lambda Functions");

				// Iterate over each Lambda Function
				_.each( res, function( lambdaFunc ) {

					if( lambdaFunc.Environment !== undefined
						&& lambdaFunc.Environment.Variables !== undefined
						&& lambdaFunc.Environment.Variables.COREFW_VERSION_HASH !== undefined
						&& TIPE( lambdaFunc.Environment.Variables.COREFW_VERSION_HASH ) === "string"
						&& lambdaFunc.Environment.Variables.COREFW_VERSION_HASH.length === 32
						&& lambdaFunc.Environment.Variables.COREFW_SERVICE_BRANCH !== undefined
						&& lambdaFunc.Environment.Variables.COREFW_SERVICE_BRANCH === me.gitBranch ) {

						let versionHash = lambdaFunc.Environment.Variables.COREFW_VERSION_HASH.toLowerCase();
						final[ versionHash ] = lambdaFunc;

						validFunctionCount++;

					}

				});

				if( validFunctionCount === 0 ) {
					me.$log( "critical", "lambda.function.list.empty", "No valid functions were found in Lambda; the aggregator cannot proceed!");
				} else {

					// Give someone some stats..
					me.$count( validFunctionCount, "lambda.function.relevant", "Found {{value}} Relevant Lambda Functions.");

				}

				return final;

			}

		)

	}



	// </editor-fold>

	// <editor-fold desc="--- Service API Aggregation ----------------------------------------------------------------">



	buildEndpointData( serviceData ) {

		// Locals
		let me = this;
		let ret = {};
		let totalEndpointsResolved = 0;

		// Deps
		const _ = me.$dep("lodash");
		const TIPE = me.$dep("tipe");

		// Tell someone...
		me.$log( "info", "endpoint.data.start", "Resolving Endpoint Data ...");

		// Iterate over each service
		_.each( serviceData, function( service ) {

			// Ensure this service has functions..
			if( service.serverless !== undefined && service.serverless.functions !== undefined ) {

				// Iterate over each function
				_.each( service.serverless.functions, function( func, shortFunctionName ) {

					// Resolve the function name
					let functionName;
					if( func.name !== undefined && TIPE(func.name) === "string" && func.name.length > 0 ) {
						functionName = func.name;
					} else {
						functionName = shortFunctionName;
					}

					// Filter out functions that do not meet the
					// minimum requirements for processing.
					if( func.environment === undefined ) {

						me.$log( "warning", "endpoint.data.invalid.env", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; no environment variables defined!");

					} else if( func.environment.COREFW_VERSION_HASH === undefined
						|| TIPE(func.environment.COREFW_VERSION_HASH) !== "string"
						|| func.environment.COREFW_VERSION_HASH.length !== 32 ) {

						me.$log( "warning", "endpoint.data.invalid.hash", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; missing or invalid COREFW_VERSION_HASH environment variable!");

					} else if( func.events === undefined
						|| TIPE(func.events) !== "array"
						|| func.events === 0 ) {

						me.$log( "warning", "endpoint.data.invalid.events", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; no events are defined for this function.");

					} else {

						let validEventCount = 0;

						// Iterate over the function events; we're looking for
						// HTTP events that have a method, path, and use the
						// 'lambda-proxy' integration.
						_.each( func.events, function( ev ) {

							if( ev.http === undefined || TIPE(ev.http) !== "object" ) {

								// Skip this event, silently...

							} else if( ev.http.path === undefined || TIPE( ev.http.path ) !== "string" || ev.http.path.length === 0 ) {

								// All HTTP events should have a path, so, we
								// need to fire a warning if the path is missing...
								me.$log( "warning", "endpoint.data.invalid.path", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'path' is undefined or invalid.");

							} else if( ev.http.method === undefined || TIPE( ev.http.method ) !== "string" || ev.http.method.length === 0 ) {

								// All HTTP events should have a method, so, we
								// need to fire a warning if the method is missing...
								me.$log( "warning", "endpoint.data.invalid.method", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'method' is undefined or invalid.");

							} else if( ev.http.method !== "get" && ev.http.method !== "patch" &&
								ev.http.method !== "post" && ev.http.method !== "delete" ) {

								// If we encounter an unexpected 'method', we need to fire a warning...
								me.$log( "warning", "endpoint.data.unsupported.method", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'method' specified ('" + ev.http.method + "') is not supported.");

							} else if( ev.http.integration === undefined || TIPE( ev.http.integration ) !== "string" || ev.http.integration.length === 0 ) {

								// All HTTP events should specify an 'integration', so, we
								// need to fire a warning if the integration is missing...
								me.$log( "warning", "endpoint.data.invalid.integration", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'integration' is undefined or invalid.");

							} else if( ev.http.integration !== "lambda-proxy" ) {

								// This aggregator only supports the 'lambda-proxy' integration
								me.$log( "warning", "endpoint.data.unsupported.integration", "Invalid HTTP event found for '" + shortFunctionName + "' from service '" + service.name + "'; the 'integration' specified ('" + ev.http.integration + "') is not supported.");

							} else {

								// We have a good event; tell someone...
								me.$log( "info", "endpoint.data.resolved", "... Identified Path: '" + ev.http.method.toUpperCase() + " " + ev.http.path + "' -> '" + functionName + "'");

								// Persist the path..
								if( ret[ ev.http.path ] === undefined ) {
									ret[ ev.http.path ] = {};
								}
								ret[ ev.http.path ][ ev.http.method.toLowerCase() ] = {
									name: functionName,
									shortName: shortFunctionName,
									description: func.description,
									path: ev.http.path,
									method: ev.http.method.toLowerCase(),
									service: service.name,
									versionHash: func.environment.COREFW_VERSION_HASH.toLowerCase()
								};

								// A few counts..
								validEventCount++;
								totalEndpointsResolved++;

							}

						});

						if( validEventCount === 0 ) {

							me.$log( "warning", "endpoint.data.events.none", "Skipping function '" + shortFunctionName + "' from service '" + service.name + "'; no valid HTTP events were found.");

						}


					}


				});

			}

		});

		// Give someone some stats..
		me.$count( totalEndpointsResolved, "endpoints.resolved", "Resolved {{value}} endpoints");

		// All done
		return ret;

	}

	get _cfTplOuter() {

		return {
			"AWSTemplateFormatVersion" : "2010-09-09",
			"Description"              : "API Facade Layer Generated by the Core-Microservices::ServiceAggregator.",
			"Resources"                : {},
			"Outputs"                  : {
				"ApiRootUrl" : {
					"Description" : "The Root API URL",
					"Value"       : {
						"Fn::Join" : [
							"",
							[
								"https://",
								{
									"Ref" : "${apiRefName}",
								},
								".execute-api.us-east-1.",
								{
									"Ref" : "AWS::URLSuffix",
								},
								"/${gitBranch}",
							],
						],
					},
				},
			},
		};

	}
	get _cfTplRestApi() {

		return {
				"Type"       : "AWS::ApiGateway::RestApi",
				"Properties" : {
					"Name"                  : "${apiName}",
					"EndpointConfiguration" : {
						"Types" : [
							"EDGE",
						],
					},
				},
			};

	}
	get _cfTplRootResource() {

		return {
			"Type"       : "AWS::ApiGateway::Resource",
			"Properties" : {
				"ParentId"  : {
					"Fn::GetAtt" : [
						"${apiRefName}",
						"RootResourceId",
					],
				},
				"PathPart"  : "${pathPart}",
				"RestApiId" : {
					"Ref" : "${apiRefName}",
				},
			},
		};

	}
	get _cfTplChildResource() {

		return {
			"Type"       : "AWS::ApiGateway::Resource",
			"Properties" : {
				"ParentId"  : {
					"Ref" : "${parentRefName}",
				},
				"PathPart"  : "${pathPart}",
				"RestApiId" : {
					"Ref" : "${apiRefName}",
				},
			},
		};

	}
	get _cfTplMethod() {

		return {
			"Type"       : "AWS::ApiGateway::Method",
			"Properties" : {
				"HttpMethod"        : "${httpMethod}",
				"RequestParameters" : {},
				"ResourceId"        : {
					"Ref" : "${resourceRefName}",
				},
				"RestApiId"         : {
					"Ref" : "${apiRefName}",
				},
				"ApiKeyRequired"    : false,
				"AuthorizationType" : "NONE",
				"Integration"       : {
					"IntegrationHttpMethod" : "POST",
					"Type"                  : "AWS_PROXY",
					"Uri"                   : {
						"Fn::Join" : [
							"",
							[
								"arn:",
								{
									"Ref" : "AWS::Partition",
								},
								":apigateway:",
								{
									"Ref" : "AWS::Region",
								},
								":lambda:path/2015-03-31/functions/",
								"${lambdaFunctionArn}",
								"/invocations",
							],
						],
					},
				},
				"MethodResponses"   : [],
			},
		};

	}
	get _cfTplDeployment() {

		return {
			"Type"       : "AWS::ApiGateway::Deployment",
			"Properties" : {
				"RestApiId" : {
					"Ref" : "${apiRefName}",
				},
				"StageName" : "${gitBranch}",
				"Description": "${description}"
			},
			"DependsOn"  : [],
		};

	}
	get _cfTplPermission() {

		return {
			"Type"       : "AWS::Lambda::Permission",
			"Properties" : {
				"FunctionName" : "${lambdaFunctionArn}",
				"Action"       : "lambda:InvokeFunction",
				"Principal"    : {
					"Fn::Join" : [
						"",
						[
							"apigateway.",
							{
								"Ref" : "AWS::URLSuffix",
							},
						],
					],
				},
				"SourceArn"    : {
					"Fn::Join" : [
						"",
						[
							"arn:",
							{
								"Ref" : "AWS::Partition",
							},
							":execute-api:",
							{
								"Ref" : "AWS::Region",
							},
							":",
							{
								"Ref" : "AWS::AccountId",
							},
							":",
							{
								"Ref" : "${apiRefName}",
							},
							"/*/*",
						],
					],
				},
			},
		};

	}

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

	buildCloudFormationTemplate( endpointData, lambdaData ) {

		// Locals
		let me = this;
		let cfTemplate, methodRefNames;

		// Dependencies
		const _ = me.$dep("lodash");

		// Tell someone
		me.$log( "info", "cf.tpl.start", "Generating the CloudFormation Template ...");

		// Define global cf template variables
		let vars = {
			apiName: me.aggregationConfig.FacadeApi.name,
			apiRefName: "ApiGatewayRestApi"
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

	_buildAagResourcesForCf( endpointData, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Iterate over each resource path
		_.each( endpointData, function( eps, path ) {

			// Break the path down into parts..
			let pathParts = path.split("/");
			let parentPath = "";
			let parentRefName = null;

			// .. and iterate over each part ..
			_.each( pathParts, function( part, depth ) {

				let refName, fullPath, tplName;

				// Build the full path & acquire
				// the appropriate template.
				if( depth === 0 ) {
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
				if( cfTemplate.Resources[ refName ] === undefined ) {

					let vars = Object.assign( {}, globalCfVars, {
						parentRefName: parentRefName,
						pathPart: part
					});
					cfTemplate.Resources[ refName ] = me._generateCfPart( tplName, vars );

				}

				// Our full path will be the parent path, and our
				// reference name will be the parent ref for the
				// next resource:
				parentPath    = fullPath;
				parentRefName = refName;


			});

		});

	}

	_buildAagMethodsForCf( endpointData, lambdaData, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;
		let methodRefNames = [];

		// Dependencies
		const _ = me.$dep("lodash");

		// Iterate over each resource path
		_.each( endpointData, function( endpoints, path ) {

			// .. and over each endpoint
			_.each( endpoints, function( endpoint, httpMethod ) {

				// Resolve the ref name of the parent resource
				let resourceRefName = me._convPathToCfrn( path );

				// Resolve the method ref name
				let refName = me._convMethodToCfrn( path, httpMethod );

				// Resolve the version hash
				let versionHash = endpoint.versionHash;

				// Find the ARN/name for the lambda function
				if( lambdaData[ versionHash] === undefined ) {
					me.$log( "warning", "cf.tpl.map.error.missing", "Skipping method mapping for '" + path + "'; could not find a valid Lambda function (using 'versionHash').");
				} else {

					let lambdaFunctionArn  = lambdaData[ versionHash].FunctionArn;
					let lambdaFunctionName = lambdaData[ versionHash].FunctionName;

					let vars = Object.assign( {}, globalCfVars, {
						httpMethod: httpMethod.toUpperCase(),
						resourceRefName,
						lambdaFunctionArn,
						lambdaFunctionName
					});

					// Add the method
					cfTemplate.Resources[ refName ] = me._generateCfPart( "Method", vars );

					// Capture the reference name
					methodRefNames.push( refName );

				}

			});

		});

		// Done, return the method reference names
		return methodRefNames;

	}

	//_buildAagMethodsForCf( endpointData, cfTemplate, lambdaData, vars )

	_buildLambdaPermsForCf( lambdaData, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;
		let methodRefNames = [];

		// Dependencies
		const _ = me.$dep("lodash");

		// Iterate over each lambda function
		_.each( lambdaData, function( func, versionHash ) {

			// Resolve Ref Name
			let refName = me._convLambdaFnToCfrn( func.FunctionName );

			// Get some variables from the Lambda data
			let lambdaFunctionArn  = func.FunctionArn;
			let lambdaFunctionName = func.FunctionName;

			// Merge the global vars
			let vars = Object.assign( {}, globalCfVars, {
				lambdaFunctionArn,
				lambdaFunctionName
			});

			// Add the permission block
			cfTemplate.Resources[ refName ] = me._generateCfPart( "Permission", vars );

		});

	}

	_buildAagDeploymentForCf( methodRefNames, cfTemplate, globalCfVars ) {

		// Locals
		let me = this;
		let tpl;

		// Dependencies
		const MOMENT = me.$dep("moment");

		// Resolve a deployment reference name
		let refName = me._formatCfName( "AagDeployment", MOMENT().format("YYYY-MM-DD-HH-mm-s-SSS") );

		// Merge the global vars
		let vars = Object.assign( {}, globalCfVars, {
			description: "Generated by the CoreMicroservices::ServiceAggregator on " + MOMENT().format()
		});

		// Add the permission block
		tpl = me._generateCfPart( "Deployment", vars );

		// Add the DependsOn block
		tpl.DependsOn = methodRefNames;

		// Update the template byRef
		cfTemplate.Resources[ refName ] = tpl;

	}

	_formatCfName( prefix, str, suffix ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Param Coercion
		if( prefix === null ) {
			prefix = "";
		}
		if( suffix === null || suffix === undefined ) {
			suffix = "";
		}

		// Remove Unsupported Characters
		str = str.replace(/\}/ig, " Var ");
		str = str.replace(/[^a-z0-9]/ig, " ");

		// Title Case..
		str = _.startCase( str );

		// Remove the white space
		str = str.replace(/\s+/ig, "");

		// Done..
		return prefix + str + suffix;

	}

	_convPathToCfrn( path ) {
		return this._formatCfName( "AagResource", path, null );
	}

	_convMethodToCfrn( path, httpMethod ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Defer to _formatCfName
		return me._formatCfName( "AagMethod", path, _.capitalize( httpMethod ) );

	}

	_convLambdaFnToCfrn( functionName ) {
		return this._formatCfName( null, functionName, "AagPerms" );
	}


	// </editor-fold>

	// <editor-fold desc="--- AWS CloudFormation Wrappers ------------------------------------------------------------">


	/**
	 * The CloudFormation client that is provided by the AWS SDK.
	 *
	 * @property lambda
	 * @access public
	 * @returns {AWS.CloudFormation}
	 */
	get cloudFormation() {

		// Locals
		let me = this;

		if( me._cloudFormationClient === undefined ) {

			// Dependencies
			let AWS = me.$dep( "aws" );

			// Init S3 client
			me._cloudFormationClient = new AWS.CloudFormation(
				{
					apiVersion: "2010-05-15",
					region: me.awsRegion
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
	 * @returns {Promise<array>}
	 */
	_createStack( cfTemplate ) {

		// Locals
		let me = this;
		let stackName = me.aggregationConfig.FacadeApi.cfStackName;

		// Dependencies
		const _ = me.$dep("lodash");
		const TIPE = me.$dep("tipe");

		// Configure CF Operation Params
		let params = {
			StackName: stackName,
			Tags: [
				{
					Key: "COREFW_IS_FACADE",
					Value: "yes"
				}
			],
			TemplateBody: JSON.stringify( cfTemplate )
		};

		// Tell someone...
		me.$log( "info", "cf.deploy.create.start", "Creating CloudFormation Stack '" + stackName + "' ...");


		// Defer to AWS SDK
		return me.cloudFormation.createStack( params ).promise().then(

			function afterCfStackCreate( results ) {

				let stackId = results.StackId;

				// Tell someone that the stack is being created
				me.$log( "info", "cf.deploy.create.pending", "... The CloudFormation Stack is being created; waiting for success ...");

				// Wait for the create operation to complete
				return me._waitForStackStates( stackId,
					["CREATE_COMPLETE", "CREATE_FAILED", "ROLLBACK_COMPLETE", "ROLLBACK_FAILED"],
					5, 30
				).then(

					function ( stackState ) {

						if( stackState === "CREATE_COMPLETE" ) {
							me.$log( "info", "cf.deploy.create.success", "... The CloudFormation Stack has been created successfully!");
							return stackId;
						} else {
							me.$throw( "cf.deploy.create.failed", "CF Create Failed; unexpected Stack State returned: '" + stackState + "'" );
						}

					}

				);


				return me.cloudFormation.waitFor("stackCreateComplete", {
					StackName: stackId
				}).promise().then(

					function() {
						me.$log( "info", "cf.deploy.create.success", "... CF Stack '" + stackId + "' has been created successfully!");
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
	 * @returns {Promise<array>}
	 */
	_updateStack( stackId, cfTemplate ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");
		const TIPE = me.$dep("tipe");

		// Configure CF Operation Params
		let params = {
			StackName: stackId,
			TemplateBody: JSON.stringify( cfTemplate )
		};

		// Tell someone...
		me.$log( "info", "cf.deploy.update.start", "Updating CloudFormation Stack '" + stackId + "' ...");


		// Defer to AWS SDK
		return me.cloudFormation.updateStack( params ).promise().then(

			function afterCfStackUpdate( results ) {

				// Tell someone that the stack is being updated
				me.$log( "info", "cf.deploy.update.pending", "... The CloudFormation Stack is updating; waiting for success ...");

				// Wait for the update
				return me._waitForStackStates( stackId,
					["UPDATE_COMPLETE", "UPDATE_ROLLBACK_COMPLETE", "ROLLBACK_COMPLETE", "ROLLBACK_FAILED", "UPDATE_ROLLBACK_FAILED"],
					5, 30
				).then(

					function ( stackState ) {

						if( stackState === "UPDATE_COMPLETE" ) {
							me.$log( "info", "cf.deploy.update.success", "... The CloudFormation Stack has updated successfully!");
							return stackId;
						} else {
							me.$throw( "cf.deploy.update.failed", "CF Update Failed; unexpected Stack State returned: '" + stackState + "'" );
						}

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
	 * @returns {Promise<array>}
	 */
	_describeStacks( stackName ) {

		// Locals
		let me = this;

		// Configure CF Operation Params
		let params = {};

		// Apply Stack Name Filter
		if( stackName !== undefined && stackName !== null ) {
			params.StackName = stackName;
		}

		// Defer to AWS SDK
		return me.cloudFormation.describeStacks( params ).promise().then(

			function afterCfStackDescribe( results ) {
				return results.Stacks;
			}

		).catch(

			function onCFDescribeStackError( err ) {

				return [];

			}

		);

	}

	_waitForStackStates( stackId, states, retryIntervalSec, maxRetries, currentAttempt ) {

		// Locals
		let me = this;
		let retryIntervalMs = retryIntervalSec * 1000;

		// Dependencies
		const bb = me.$dep("bluebird");
		const _ = me.$dep("lodash");

		// Param Coercion
		if( currentAttempt === undefined || currentAttempt === null ) {
			currentAttempt = 1;
		}

		// Iterate
		return bb.delay( retryIntervalMs ).then(

			function onIteration() {

				return me._describeStacks( stackId ).then(

					function afterDescribe( res ) {

						if( _.includes( states, res[0].StackStatus ) ) {

							// Done!
							return res[0].StackStatus;

						} else {

							// The state still isn't what we want, so, we'll try again
							// if we've not exceeded the "maxRetries" value.
							if( currentAttempt <= maxRetries ) {
								me.$log( "info", "cf.stack.wait.more", "... Still Waiting ...");
								return me._waitForStackStates( stackId, states, retryIntervalSec, maxRetries, ( currentAttempt + 1 ) );
							} else {
								me.$throw( "cf.stack.wait.timeout", "Timeout while waiting for Stack Status" );
							}


						}

					}

				)

			}

		);


	}


	// </editor-fold>

	// <editor-fold desc="--- CloudFormation Deployment --------------------------------------------------------------">

	deployCloudFormationTemplate( cfTemplate ) {

		// Locals
		let me = this;
		let stackName = me.aggregationConfig.FacadeApi.cfStackName;

		// First, we need to check to see if the stack already exists..
		return me._describeStacks( stackName ).then(

			function afterDescribeStack( res ) {

				if( res.length === 0 ) {

					// Create a new stack
					return me._createStack( cfTemplate );

				} else {

					// Extract the full stack id from the
					// describeStacks call...
					let stackId = res[0].StackId;

					// .. and use that ID to update the stack
					return me._updateStack( stackId, cfTemplate );

				}



			}

		);

	}



	// </editor-fold>


}

module.exports = ServiceAggregator;
