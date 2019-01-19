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

		// Deps
		const _ = me.$dep("lodash");
		const bb = me.$dep("bluebird");

		// Tell someone...
		me.$log( "notice", "start", "The Service Aggregator is starting up ...");


		me.$inspect( me.aggregationConfig );

		/*
		return me.getServiceData().then(

			function( res ) {

				me.$inspect( res );

			}

		)
		*/

		return me.getLambdaFunctions().then(

			function( res ) {

				me.$inspect( res );

			}

		);


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


	// <editor-fold desc="--- Other Properties -----------------------------------------------------------------------">





	// </editor-fold>

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

	// <editor-fold desc="--- AWS S3 Wrappers ------------------------------------------------------------------------">


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

				me.$inspect( results.NextMarker );

				if( TIPE( results.NextMarker ) === "string" && results.NextMarker !== "" ) {

					return me._listFunctions( results.NextMarker ).then(

						function( moreData ) {

							return details.concat( moreData );

						}

					)

				} else {
					return details;
				}

				/*
				_.each( results, function( val, key ) {

					console.log("[" + key + "]");

				});
				*/



				return {};

				/*
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
				*/

				return results;

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

		return me._listFunctions( null ).then(

			function( res ) {

				return res;

			}

		)

	}



	// </editor-fold>


}

module.exports = ServiceAggregator;
