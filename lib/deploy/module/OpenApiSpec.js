/**
 * @file Defines the OpenApiSpec class.
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
 * This "Deployment Module" deploys the OpenAPI specification (formerly Swagger)
 * in both JSON and YAML formats to the deployment target(s).
 *
 * @memberOf Deploy.Module
 * @extends Deploy.Module.BaseMetaDeployModule
 */
class OpenApiSpec extends ParentClass {

	// <editor-fold desc="--- Config Properties ------------------------------">


	/**
	 * The remote filename that should be assigned to the JSON version of
	 * the OpenAPI specification during deployment. When this value is
	 * NULL (or not provided), subject to the dynamic default considerations
	 * below, then the openapi.json file will not be deployed.
	 *
	 * Note: The default value for this property varies depending on the
	 * value of `this.yamlFilename`:
	 *
	 *   - If yamlFile is NULL or not present, then the default value of
	 *     this property will be "openapi.json".
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
	 * @default "openapi.json"
	 * @type {string|null}
	 */
	get jsonFilename() {

		if( this.yamlFilename === null ) {
			return this.getConfigValue( "jsonFilename", "openapi.json" );
		} else {
			return this.getConfigValue( "jsonFilename", null );
		}

	}

	set jsonFilename( val ) {
		this.setConfigValue( "jsonFilename", val );
	}


	/**
	 * The remote filename that should be assigned to the YAML version of
	 * the OpenAPI specification during deployment. When this value is
	 * NULL (or not provided), the OpenAPI specification will not be
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
	 * When TRUE the generated OpenAPI specification will be "dereferenced" during rendering, making it as verbose as possible with zero $refs.
	 *
	 * @access public
	 * @default true
	 * @type {boolean}
	 */
	get dereference() {
		return this.getConfigValue( "dereference", true );
	}

	set dereference( val ) {
		this.setConfigValue( "dereference", val );
	}


	// </editor-fold>

	// <editor-fold desc="--- Other Properties -------------------------------">


	//get specGeneratorClass() {
	//	return require("../../openapi/OpenApiSpecGenerator");
	//}

	get specGenerator() {

		// Locals
		let me = this;

		if( me._specGenerator === undefined ) {

			let cfg = {
				serviceRootPath: me.serviceRootPath
			};
			me._specGenerator = me.$spawn( "microservicesLib", "openapi/OpenApiSpecGenerator", cfg );

		}

		return me._specGenerator;

	}

	get openApiSpec() {

		// Locals
		let me = this;

		// Caching
		if( me._openApiSpec === undefined ) {

			let gen = me.specGenerator;
			me._openApiSpec = gen.buildSpec( me.dereference );

		}

		// Done
		return me._openApiSpec;

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
	 * @param {Deploy.Target.BaseMetaDeployTarget} target The deployment target.
	 * @returns {Promise}
	 */
	deployToTarget( target ) {

		// Locals
		let me 				= this;
		let jsonFilename 	= me.jsonFilename;
		let yamlFilename 	= me.yamlFilename;
		let jsonResults, yamlResults;

		// Get/build the spec (as a promise)..
		return me.openApiSpec.then(

			function( specData ) {

				// Upload the OpenAPI spec in JSON format, if desired..
				if( jsonFilename !== null ) {
					return target.putObjectAsJson( jsonFilename, specData ).then(

						function( res ) {
							jsonResults = res;
							return specData;
						}

					);
				} else {

					jsonResults = null;
					return specData;

				}

			}

		).then(

			function( specData ) {

				// Upload the OpenAPI spec in YAML format, if desired..
				if( yamlFilename !== null ) {
					return target.putObjectAsYaml( yamlFilename, specData ).then(

						function( res ) {
							yamlResults = res;
							return specData;
						}

					);
				} else {

					yamlResults = null;
					return specData;

				}

			}

		).then(

			function() {

				// Compile the final results
				let finalResults = [];

				if( jsonResults !== null ) {
					finalResults.push( jsonResults );
				}

				if( yamlResults !== null ) {
					finalResults.push( yamlResults );
				}

				return finalResults;

			}

		);

	}

	// </editor-fold>

}

module.exports = OpenApiSpec;
