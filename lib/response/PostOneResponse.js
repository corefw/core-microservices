/**
 * @file Defines the CreateOneResponse class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const SuccessResponse = require( "./SuccessResponse" );

/**
 * This response class represents an API response for a 'CreateOne' endpoint.
 *
 * @memberOf Response
 * @extends Response.SuccessResponse
 */
module.exports = class CreateOneResponse extends SuccessResponse {

	/**
	 * @inheritDoc
	 *
	 */
	_initialize( cfg ) {

		cfg.isError 	= false;
		cfg.statusCode 	= 201;	// Created

		// Call parent
		super._initialize( cfg );
	}

	/**
	 * Creates a JSON-API compatible scaffold for the response body [object].
	 *
	 * This method extends the `BaseResponse` scaffold by adding the data.
	 *
	 * @private
	 * @returns {Object} Response body.
	 */
	_createResponseBody() {

		const me = this;

		let sBody = super._createResponseBody();

		if ( me.data ) {

			sBody.data = me.data._serializeToJsonApiObject();

		} else {

			sBody.data = {};
		}

		return sBody;
	}
};
