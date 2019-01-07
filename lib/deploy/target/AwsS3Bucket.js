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

	// <editor-fold desc="--- Config Properties ------------------------------">

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

	// <editor-fold desc="--- Utility Methods --------------------------------">







	// </editor-fold>


	// <editor-fold desc="--- Deployment Methods -----------------------------">



	async deployFile( localRelPath, remoteRelPath ) {
		return [ this._deployOneFile( localRelPath, remoteRelPath ) ];
	}

	async deployFiles( filesToDeploy ) {

		// Locals
		let me = this;

		// Dependencies
		const bb = me.$dep("bluebird");

		// Execute each..
		return bb.map( filesToDeploy, function( item, index ) {

			return me._deployOneFile( item.localRelPath, item.remoteRelPath );

		});

	}

	async _deployOneFile( localRelPath, remoteRelPath ) {

		// Locals
		let me = this;
		let s3 = me.s3;

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

	async putObjectAsJson( remoteRelPath, obj ) {

		// Locals
		let me = this;

		// Convert to JSON
		let json = me._convertObjectToJson( obj );

		// Upload it
		return me._putObject( remoteRelPath, json );

	}


	async putObjectAsYaml( remoteRelPath, obj ) {

		// Locals
		let me = this;

		// Convert to YAML
		let yaml = me._convertObjectToYaml( obj );

		// Upload it
		return me._putObject( remoteRelPath, yaml );

	}

	async _putObject( remoteRelPath, body ) {

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

		//me.$inspect( params );

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

	resolveRemoteAbsFull( relRemotePath ) {

		// Locals
		let me = this;

		// Get Abs Path
		let abs = me.resolveRemoteAbs( relRemotePath );

		// Append with protocol and bucket name
		return "s3://" + me.bucket + "/" + abs;

	}



	// </editor-fold>



}

module.exports = AwsS3Bucket;
