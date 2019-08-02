/**
 * @file Defines the ReadManyEndpoint class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

/** @type Endpoint.BaseEndpoint */
const BaseEndpoint = require( "./BaseEndpoint" );

/**
 * The parent class for all READ ('GET') endpoints that return (or can return)
 * more than one record.
 *
 * @memberOf Endpoint
 * @extends Endpoint.BaseEndpoint
 */
class ReadManyEndpoint extends BaseEndpoint {

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
		cfg.endpointType = "readMany";

		// Define the default response class
		cfg.defaultSuccessResponse 	= "ReadManyResponse";

		// Call Parent
		super( cfg );
	}
}

module.exports = ReadManyEndpoint;
