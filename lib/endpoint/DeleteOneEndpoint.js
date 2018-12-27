/**
 * @file Defines the DeleteOneEndpoint class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseEndpoint = require( "./BaseEndpoint" );

/**
 * The parent class for all DELETE ('DELETE') endpoints that delete one record
 * based on a single ID value.
 *
 * @memberOf Endpoint
 * @extends Endpoint.BaseEndpoint
 */
class DeleteOneEndpoint extends BaseEndpoint {

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
		cfg.endpointType = "deleteOne";

		// Define the default response class
		cfg.defaultSuccessResponse 	= "DeleteOneResponse";

		// Call Parent
		super( cfg );
	}
}

module.exports = DeleteOneEndpoint;
