/**
 * @file Defines the PackageFile class.
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
 * This "Deployment Module" deploys the package.json file in both JSON
 * and YAML formats to the deployment target(s).
 *
 * @memberOf Deploy.Module
 * @extends Deploy.Module.BaseMetaDeployModule
 */
class PackageFile extends ParentClass {

	// <editor-fold desc="--- Config Properties ------------------------------">

	/**
	 * The remote filename that should be assigned to the JSON version of
	 * package.json during deployment. When this value is NULL (or not
	 * provided), subject to the dynamic default considerations below, then
	 * the package.json file will not be deployed.
	 *
	 * Note: The default value for this property varies depending on the
	 * value of `this.yamlFilename`:
	 *
	 *   - If yamlFile is NULL or not present, then the default value of
	 *     this property will be "package.json".
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
	 * @default "package.json"
	 * @type {string|null}
	 */
	get jsonFilename() {

		if ( this.yamlFilename === null ) {

			return this.getConfigValue( "jsonFilename", "package.json" );
		}

		return this.getConfigValue( "jsonFilename", null );
	}

	set jsonFilename( val ) {

		this.setConfigValue( "jsonFilename", val );
	}

	/**
	 * The remote filename that should be assigned to the YAML version of
	 * package.json during deployment. When this value is NULL (or not
	 * provided), the package.json file will not be converted to YAML and
	 * deployed to the remote deployment target.
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

		let jsonFilename	= me.jsonFilename;
		let yamlFilename	= me.yamlFilename;
		let promises		= [];

		// Deploy the JSON version (package.json verbatim)
		if ( jsonFilename !== null ) {

			promises.push( target.putObjectAsJson( "package.json", me.packageData ) );
		}

		// Deploy the YAML version
		if ( yamlFilename !== null ) {

			promises.push( target.putObjectAsYaml( "package.yml", me.packageData ) );
		}

		// All done..
		return Promise.all( promises );
	}

	// </editor-fold>
}

module.exports = PackageFile;
