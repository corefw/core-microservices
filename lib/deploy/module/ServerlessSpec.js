/**
 * @file Defines the ServerlessSpec class.
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

const ParentClass	= require( "./BaseMetaDeployModule" );

/**
 * This "Deployment Module" deploys the Serverless specification file
 * (serverless.json) in both JSON and YAML formats to the deployment target(s).
 *
 * @memberOf Deploy.Module
 * @extends Deploy.Module.BaseMetaDeployModule
 */
class ServerlessSpec extends ParentClass {

	// <editor-fold desc="--- Config Properties ------------------------------">

	/**
	 * The remote filename that should be assigned to the JSON version of
	 * the Serverless specification during deployment. When this value is
	 * NULL (or not provided), subject to the dynamic default considerations
	 * below, then the serverless.json file will not be deployed.
	 *
	 * Note: The default value for this property varies depending on the
	 * value of `this.yamlFilename`:
	 *
	 *   - If yamlFile is NULL or not present, then the default value of
	 *     this property will be "serverless.json".
	 *
	 *   - If yamlFile is non-null, then the default value of this property
	 *     will be NULL.
	 *
	 * The point of the dynamic default value is based on the idea that if the
	 * configuration provides a yamlFilename, but not a jsonFilename, then it
	 * is likely that the jsonFilename was intentionally omitted.  Conversely,
	 * if neither jsonFile nor yamlFilename is provided, and also in
	 * consideration of the fact that the module was defined and "included",
	 * then the likely intent was NOT for this module to skip both variations.
	 *
	 * @access public
	 * @default "serverless.json"
	 * @type {string|null}
	 */
	get jsonFilename() {

		if ( this.yamlFilename === null ) {

			return this.getConfigValue( "jsonFilename", "serverless.json" );
		}

		return this.getConfigValue( "jsonFilename", null );
	}

	set jsonFilename( val ) {

		this.setConfigValue( "jsonFilename", val );
	}

	/**
	 * The remote filename that should be assigned to the YAML version of
	 * the Serverless specification during deployment. When this value is
	 * NULL (or not provided), the Serverless specification will not be
	 * converted to YAML and deployed to the remote deployment target.
	 *
	 * @access public
	 * @default null
	 * @type {string|null}
	 */
	get yamlFilename() {

		return this.getConfigValue( "yamlFilename", null );
	}

	set yamlFilename( val ) {

		this.setConfigValue( "yamlFilename", val );
	}

	/**
	 * Defines whether or not the "environment" portion of the Serverless
	 * specification, which often includes sensitive information, should be
	 * truncated before deployment.
	 *
	 * @access public
	 * @default true
	 * @type {boolean}
	 */
	get truncateEnvironment() {

		return this.getConfigValue( "truncateEnvironment", true );
	}

	set truncateEnvironment( val ) {

		this.setConfigValue( "truncateEnvironment", val );
	}

	// </editor-fold>

	// <editor-fold desc="--- Main Deployment Logic --------------------------">

	/**
	 * This is the main entry point for this deployment module. This method will
	 * be called, automatically, for each configured "deployment target" by
	 * the MetaDeploymentManager class.
	 *
	 * @access public
	 * @async
	 * @param {Deploy.Target.BaseMetaDeployTarget} target - The deployment target.
	 * @returns {Promise<Array>} Deployment results.
	 */
	deployToTarget( target ) {

		// Locals
		let me = this;

		let jsonFilename		= me.jsonFilename;
		let yamlFilename		= me.yamlFilename;
		let truncateEnvironment	= me.truncateEnvironment;

		let jsonResults;
		let yamlResults;

		// Dependencies
		const PATH = me.$dep( "path" );

		// Load the dynamic spec file, 'serverless.js'
		let serverlessSpecPath		= PATH.join( me.serviceRootPath, "serverless.js" );
		let serverlessSpecPromise	= require( serverlessSpecPath );

		// The spec is, actually, provided as a Promise..
		// So, we need to wait for it to resolve..
		return serverlessSpecPromise.then(

			function ( serverlessSpec ) {

				// Truncate environment variables, if desired (default)
				if (
					truncateEnvironment &&
					serverlessSpec.provider !== undefined &&
					serverlessSpec.provider.environment !== undefined
				) {

					delete serverlessSpec.provider.environment;
				}

				// Go to the next step ...
				return serverlessSpec;
			}

		).then(

			function ( serverlessSpec ) {

				// Upload the Serverless spec in JSON format, if desired..
				if ( jsonFilename !== null ) {

					return target.putObjectAsJson( jsonFilename, serverlessSpec ).then(

						function ( res ) {

							jsonResults = res;

							return serverlessSpec;
						}
					);
				}

				jsonResults = null;

				return serverlessSpec;
			}

		).then(

			function ( serverlessSpec ) {

				// Upload the Serverless spec in YAML format, if desired..
				if ( yamlFilename !== null ) {

					return target.putObjectAsYaml( yamlFilename, serverlessSpec ).then(

						function ( res ) {

							yamlResults = res;

							return serverlessSpec;
						}
					);
				}

				yamlResults = null;

				return serverlessSpec;
			}

		).then(

			function () {

				// Compile the final results
				let finalResults = [];

				if ( jsonResults !== null ) {

					finalResults.push( jsonResults );
				}

				if ( yamlResults !== null ) {

					finalResults.push( yamlResults );
				}

				return finalResults;
			}

		);
	}

	// </editor-fold>
}

module.exports = ServerlessSpec;
