/**
 * @file Defines the AwsS3Bucket class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @since 5.1.30
 * @license See LICENSE.md for details about licensing.
 * @copyright 2019 C2C Schools, LLC
 */

"use strict";

// Important Note
// --------------
// This module only loads a single dependency, directly, which is the
// parent class for the class defined within. This is intended to force
// dependency loading through the parent class, by way of the `$dep()`
// method, in order to centralize dependency definition and loading.

const ParentClass	= require( "./BaseMetaDeployTarget" );

/**
 * Something...
 *
 * @abstract
 * @memberOf Deploy.Target
 * @extends Deploy.Target.BaseMetaDeployTarget
 */
class AwsS3Bucket extends ParentClass {

	// <editor-fold desc="--- Config Properties ----------------------------------------------------------------------">

	/**
	 * The AWS bucket that content should be deployed to.
	 *
	 * @access public
	 * @default null
	 * @type {*}
	 */
	get bucket() {
		return this.getConfigValue( "bucket", null );
	}

	set bucket( val ) {
		this.setConfigValue( "bucket", val );
	}

	/**
	 * The remote bucket path in which all files and subdirectories should be
	 * placed during deployment.
	 *
	 * @access public
	 * @default "/"
	 * @type {string}
	 */
	get rootPath() {
		return this.getConfigValue( "rootPath", "/" );
	}

	set rootPath( val ) {
		this.setConfigValue( "rootPath", val );
	}

	/**
	 * The AWS region in which the target S3 bucket resides.
	 *
	 * @access public
	 * @default "us-east-1"
	 * @type {string}
	 */
	get awsRegion() {
		return this.getConfigValue( "awsRegion", "us-east-1" );
	}

	set awsRegion( val ) {
		this.setConfigValue( "awsRegion", val );
	}

	/**
	 * Specifies whether or not the root deployment directory should be deleted prior to deployment.
	 *
	 * @access public
	 * @default false
	 * @type {boolean}
	 */
	get cleanFirst() {
		return this.getConfigValue( "cleanFirst", false );
	}

	set cleanFirst( val ) {
		this.setConfigValue( "cleanFirst", val );
	}



	// </editor-fold>


	// <editor-fold desc="--- Other Properties -----------------------------------------------------------------------">

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



	// </editor-fold>



	// <editor-fold desc="--- Preparation (Pre-Deploy Ops) -----------------------------------------------------------">




	/**
	 * This method is called, automatically, by the `MetaDeploymentManager`, immediately after initialization.
	 * Anything that should be done prior to the main deployment operations should be included here.
	 *
	 * @private
	 * @returns {Promise|boolean} A promise that will be fulfilled after all preparation steps have been taken or
	 * TRUE if no preparation is necessary.
	 */
	_prepare() {

		// Locals
		let me = this;

		// Do preparation steps, if desired...
		if( me.cleanFirst ) {

			return me._cleanTargetRoot();

		} else {

			return true;

		}

	}

	/**
	 * Cleans the "Root Deployment Path" of all S3 objects.  This method is called, exclusively, by `_prepare()`.
	 *
	 * @private
	 * @returns {Promise}
	 */
	_cleanTargetRoot() {

		// Locals
		let me = this;

		// Tell someone...
		me.$log("info", "clean.start", "Cleaning (deleting all objects at) the destination root path ..." );

		// Execute the delete operation...
		return me.deleteRemotePath( "/" );

	}



	// </editor-fold>


	// <editor-fold desc="--- Deployment Methods ---------------------------------------------------------------------">

	/**
	 * A direct, public, interface for the private `_deployOneFile()` method.
	 *
	 * @public
	 * @param {string} localRelPath The path of the source file, relative to the "Service Root".
	 * @param {string} remoteRelPath The path of the file's destination, relative to the "Deployment Root"
	 * @returns {Promise}
	 */
	deployFile( localRelPath, remoteRelPath ) {
		return this._deployOneFile( localRelPath, remoteRelPath );
	}

	/**
	 * Deploys multiple files to the remote.
	 *
	 * @public
	 * @param {object[]} filesToDeploy The relative local and remote paths for the files to be deployed.
	 * @returns {Promise}
	 */
	deployFiles( filesToDeploy ) {

		// Locals
		let me = this;

		// Dependencies
		const bb = me.$dep("bluebird");

		// Execute each..
		return bb.map( filesToDeploy, function( item, index ) {

			return me._deployOneFile( item.localRelPath, item.remoteRelPath );

		});

	}

	/**
	 * Deploys a single file to the remote host.
	 *
	 * @private
	 * @param {string} localRelPath The path of the source file, relative to the "Service Root".
	 * @param {string} remoteRelPath The path of the file's destination, relative to the "Deployment Root"
	 * @returns {Promise}
	 */
	_deployOneFile( localRelPath, remoteRelPath ) {

		// Locals
		let me = this;

		// Dependencies
		const FS = me.$dep("fs");

		// Resolve path(s)
		let localAbsPath = me.resolveLocalAbs( localRelPath );

		// Tell someone...
		me.$log("info", "deploy.file", "Deploying '" + localAbsPath + "' to '/" + remoteRelPath + "' ..." );

		// Read the file
		return FS.readFileAsync( localAbsPath ).then(

			function( data ) {

				return me._putObject( remoteRelPath, data );

			}

		)

	}

	/**
	 * Deploys a JavaScript object to the remote host, in JSON format.
	 *
	 * @public
	 * @param {string} remoteRelPath The path of the file's destination, relative to the "Deployment Root"
	 * @param {object} obj The object to deploy.
	 * @returns {Promise}
	 */
	putObjectAsJson( remoteRelPath, obj ) {

		// Locals
		let me = this;

		// Convert to JSON
		let json = me._convertObjectToJson( obj );

		// Upload it
		return me._putObject( remoteRelPath, json );

	}

	/**
	 * Deploys a JavaScript object to the remote host, in YAML format.
	 *
	 * @public
	 * @param {string} remoteRelPath The path of the file's destination, relative to the "Deployment Root"
	 * @param {object} obj The object to deploy.
	 * @returns {Promise}
	 */
	putObjectAsYaml( remoteRelPath, obj ) {

		// Locals
		let me = this;

		// Convert to YAML
		let yaml = me._convertObjectToYaml( obj );

		// Upload it
		return me._putObject( remoteRelPath, yaml );

	}

	/**
	 * Resolves a remote, absolute, path when provided a path that is relative to the "Deployment Root".
	 *
	 * @public
	 * @param {string} relRemotePath A remote path, relative to the "Deployment Root"
	 * @returns {string}
	 */
	resolveRemoteAbs( relRemotePath ) {

		// Locals
		let me = this;

		// Dependencies
		const PATH = me.$dep("path");
		const _ = me.$dep("lodash");

		// Resolve
		let resolved = PATH.join( me.rootPath, relRemotePath );

		// Trim leading '/'
		if( _.startsWith( resolved, "/" ) ) {
			resolved = resolved.substr( 1 );
		}

		// Done
		return resolved;

	}

	/**
	 * Resolves a remote, absolute, path when provided a path that is relative to the "Deployment Root".
	 * This method is similar to the `resolveRemoteAbs()` method except that the string returned by this method
	 * will include the "S3://" protocol handler and the name of the destination bucket.
	 *
	 * @public
	 * @param {string} relRemotePath A remote path, relative to the "Deployment Root"
	 * @returns {string}
	 */
	resolveRemoteAbsFull( relRemotePath ) {

		// Locals
		let me = this;

		// Get Abs Path
		let abs = me.resolveRemoteAbs( relRemotePath );

		// Append with protocol and bucket name
		return "s3://" + me.bucket + "/" + abs;

	}

	/**
	 * Deletes all S3 objects, within the deployment bucket, whose 'Keys' (paths) are prefixed with the
	 * provided `relRemotePath` string.
	 *
	 * @public
	 * @param {string} relRemotePath A remote path, relative to the "Deployment Root"
	 * @returns {Promise}
	 */
	deleteRemotePath( relRemotePath ) {

		// Locals
		let me = this;
		let remoteAbsPath = this.resolveRemoteAbs( relRemotePath );

		// Tell someone...
		me.$log("info", "prepare.delete.start", "... Deleting objects with path: '" + remoteAbsPath + "'" );

		// Defer to the private method
		return this._deleteRemoteAbsPath( remoteAbsPath ).then(

			function afterDeleteOperation() {

				me.$log("info", "prepare.delete.end", "... All objects at path were removed: '" + remoteAbsPath + "'" );

			}

		);

	}

	/**
	 * Deletes all S3 objects, within the deployment bucket, whose 'Keys' (paths) are prefixed with the
	 * provided `remoteAbsPath` string.
	 *
	 * @private
	 * @param {string} remoteAbsPath An absolute remote path
	 * @returns {Promise}
	 */
	_deleteRemoteAbsPath( remoteAbsPath ) {

		// Locals
		let me = this;

		// Tell someone...
		me.$log("info", "prepare.delete.batch", "... Deleting one batch" );

		// First, we need to get a list of objects...
		return me._getObjectsAtPath( remoteAbsPath ).then(

			function afterListObjects( remoteKeys ) {

				// Nothing to delete...
				if( remoteKeys.length === 0 ) {
					return true;
				}

				// Things to delete..
				return me._deleteObjects( remoteKeys ).then(

					function afterBatchDelete() {

						// Because the AWS SDK methods for listing and deleting are limited to 1,000
						// objects, we will need to run _another_ delete operation if there are more
						// than 1,000 objects that need to be removed. We'll assume that if the
						// `listObjects` operation returned exactly 1,000 results, then there are
						// probably more objects that need to be deleted...
						if( remoteKeys.length === 1000 ) {
							return me._deleteRemoteAbsPath( remoteAbsPath );
						} else {
							return true;
						}

					}

				)

			}


		).catch(

			function onS3DeleteError( err ) {

				me.$throw( "s3.deleteobjects.error", err, "S3 DeleteObjects Failed" );

			}

		);


	}


	// </editor-fold>

	// <editor-fold desc="--- S3 Wrapper Methods ---------------------------------------------------------------------">



	/**
	 * Wrapper for the AWS SDK method 'putObject'.  This method will upload a single object/file to S3.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
	 * @param {string} remoteRelPath The path, relative to the 'Deployment Root', that the file will be uploaded to.
	 * @param {string|ReadableStream|Buffer} body The contents of the file being uploaded.
	 * @returns {Promise}
	 */
	_putObject( remoteRelPath, body ) {

		// Locals
		let me = this;
		let remoteAbsPath = me.resolveRemoteAbs( remoteRelPath );
		let remoteAbsFull = me.resolveRemoteAbsFull( remoteRelPath );

		// Configure S3 Operation Params
		let params = {
			Bucket: me.bucket,
			Key: remoteAbsPath,
			Body: body
		};

		// Tell someone...
		me.$log("info", "deploy.put", "... Putting '" + remoteAbsFull + "' (" + body.length + " bytes)" );

		// Defer to S3 SDK
		return me.s3.putObject( params ).promise().then(

			function afterS3Put( results ) {

				me.$log("info", "deploy.put", "... Upload of '" + remoteAbsFull + "' completed!" );
				return results;

			}

		).catch(

			function onS3PutError( err ) {

				me.$throw( "s3.putobject.error", err, "S3 PutObject Failed" );

			}

		);

	}


	/**
	 * Wrapper for the AWS SDK method 'deleteObjects'.  This method will delete one or more objects located in the
	 * deploy target's S3 bucket based on a provided array of object keys (paths).
	 *
	 * Important: Just like `AWS.S3.deleteObjects`, this method will delete a maximum of 1,000 results.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObjects-property
	 * @param {string[]} remoteKeys The keys of one or more remote S3 objects.
	 * @returns {Promise}
	 */
	_deleteObjects( remoteKeys ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Parse the provided array and convert them into
		// objects that are compatible with the AWS S3 SDK..
		let s3ObjectDescriptions = [];

		_.each( remoteKeys, function( remoteKey ) {

			s3ObjectDescriptions.push({
				Key: remoteKey
			});

		});


		// Configure S3 Operation Params
		let params = {
			Bucket: me.bucket,
			Delete: {
				Objects: s3ObjectDescriptions
			}
		};

		// Defer to S3 SDK
		return me.s3.deleteObjects( params ).promise().catch(

			function onS3DeleteError( err ) {

				me.$throw( "s3.deleteobjects.error", err, "S3 DeleteObjects Failed" );

			}

		);

	}

	/**
	 * Wrapper for the AWS SDK method 'listObjectsV2'.  This method will list all of the objects whose
	 * 'Key' is prefixed with `remoteAbsPath` (making this, effectively, a recursive directory search).
	 *
	 * Important: Just like `AWS.S3.listObjectsV2`, this method will return a maximum of 1,000 results.
	 *
	 * @private
	 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjectsV2-property
	 * @param {string} remoteAbsPath The absolute, remote, path (key prefix) to search for S3 objects.
	 * @returns {Promise<array>}
	 */
	_getObjectsAtPath( remoteAbsPath ) {

		// Locals
		let me = this;

		// Dependencies
		const _ = me.$dep("lodash");

		// Configure S3 Operation Params
		let params = {
			Bucket: me.bucket,
			Prefix: remoteAbsPath,
			MaxKeys: 1000
		};

		// Defer to S3 SDK
		return me.s3.listObjectsV2( params ).promise().then(

			function afterS3List( results ) {

				// We're only interested in the path ('Key') of
				// each matching object, so we'll reduce our results
				// down to that...

				let final = [];

				// Iterate over each raw result
				_.each( results.Contents, function( object ) {

					// .. and capture the key
					final.push( object.Key );

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




	// </editor-fold>


}

module.exports = AwsS3Bucket;
