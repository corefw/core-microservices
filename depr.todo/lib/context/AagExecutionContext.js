/**
 * @file Defines the AagExecutionContext class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

// Important Note
// --------------
// This module only loads a single dependency, directly, which is the
// parent class for the class defined within. This is intended to force
// dependency loading through the parent class, by way of the `$dep()`
// method, in order to centralize dependency definition and loading.

const BaseHttpExecutionContext = require(
	"./abstract/BaseHttpExecutionContext"
);

/**
 * Represents an execution context whereby an endpoint is executed on
 * AWS Lambda by way of an AAG routed request.
 *
 * @memberOf ExecutionContext
 * @extends ExecutionContext.BaseHttpExecutionContext
 */
class AagExecutionContext extends BaseHttpExecutionContext {

	// noinspection JSMethodCanBeStatic, JSUnusedGlobalSymbols
	/**
	 * Overrides the serialization of the {@link Response.BaseResponse} object
	 * by returning only the `body` of the response, as an object.
	 *
	 * @private
	 * @param {Response.BaseResponse} response - The unformatted response.
	 * @returns {Object} The formatted response.
	 */
	_formatResponse( response ) {

		// https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-output-format

		return response.toPlainObject( "strBody" );
	}
}

module.exports = AagExecutionContext;
