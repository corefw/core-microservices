/**
 * @file Defines the UpdateOneEndpoint class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

/** @type Endpoint.BaseEndpoint */
const BaseEndpoint	= require( "./BaseEndpoint" );
const ERRORS		= require( "../errors" );

/**
 * The parent class for all UPDATE ('PATCH') endpoints that update one record
 * based on a single ID value.
 *
 * @memberOf Endpoint
 * @extends Endpoint.BaseEndpoint
 */
class UpdateOneEndpoint extends BaseEndpoint {

	/**
	 * @param {Object} cfg - Basic endpoint settings.
	 * @param {Object} [overrides] - A configuration object that allows certain,
	 *     default, behaviors to be overridden. This parameter is primarily
	 *     used by testing interfaces.
	 */
	constructor( cfg, overrides ) {

		// Apply Overrides
		cfg = Object.assign( {}, cfg, overrides );

		// Set Endpoint Type
		cfg.endpointType = "updateOne";

		// Define the default response class
		cfg.defaultSuccessResponse 	= "UpdateOneResponse";

		// Call Parent
		super( cfg );
	}

	/**
	 * Get a schema representing the request body within a valid request, in
	 * JSON Schema object format.
	 *
	 * @public
	 * @throws {Errors.MissingRequestBodySchemaError} If the schema is requested
	 *     but is not defined.
	 * @returns {Promise<Object>} Parameter schema.
	 */
	getRequestBodySchema() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		if ( me.hasConfigValue( "requestBodySchema" ) ) {

			return BB.resolve(
				me.getConfigValue( "requestBodySchema" )
			);
		}

		return me._loadRequestBodySchema()
			.then( function ( requestBodySchema ) {

				me.setConfigValue( "requestBodySchema", requestBodySchema );

				return requestBodySchema;
			} );
	}

	/**
	 * Loads the request body schema (from a file) using the
	 * `requestBodySchemaPath`.
	 *
	 * @private
	 * @throws {Errors.MissingRequestBodySchemaError} If the schema could not be
	 *     loaded (for any reason).
	 * @returns {Promise<Object>} The loaded request body schema.
	 */
	_loadRequestBodySchema() {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		return BB.try( function () {

			let projectPath = me.projectPath;

			/** @type Util.SchemaGenerator */
			let SchemaGenerator = require( "../util/SchemaGenerator" );

			let schemaGenerator = new SchemaGenerator( {
				serviceRootPath: projectPath,
			} );

			return schemaGenerator.buildSchema( me.requestBodySchemaPath );

		} ).catch( function ( err ) {

			throw new ERRORS.MissingRequestBodySchemaError(
				err,
				"Failed to load the request body schema."
			);
		} );
	}
}

module.exports = UpdateOneEndpoint;
