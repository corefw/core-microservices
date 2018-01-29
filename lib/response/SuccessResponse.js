/**
 * @file Defines the SuccessResponse class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseResponse = require( "./BaseResponse" );

/**
 * This is the base class for all API success responses.
 *
 * @memberOf Response
 * @extends Response.BaseResponse
 */
module.exports = class SuccessResponse extends BaseResponse {

	/**
	 * @inheritDoc
	 *
	 */
	initialize( cfg ) {

		cfg.isError 	= false;
		cfg.statusCode 	= 200;

		// Call parent
		super.initialize( cfg );
	}
};

