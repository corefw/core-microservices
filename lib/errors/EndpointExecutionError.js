/**
 * @file Defines the EndpointExecutionError class.
 */

"use strict";

const EndpointError = require( "./abstract/EndpointError" );

/**
 * A generic error that indicates that a problem occurred during an endpoint
 * execution.
 *
 * @memberOf Errors
 * @extends Errors.Abstract.EndpointError
 */
class EndpointExecutionError extends EndpointError {

	/**
	 * @param {Error} [cause] - An optional Error object that can be provided if
	 *     this error was caused by another.
	 * @param {string} message - An error message that provides clients with a
	 *     description of the error condition and, potentially, how it might be
	 *     resolved.
	 * @param {...*} [args] - Printf style arguments for the message.
	 */
	constructor( cause, message, ...args ) {

		super( cause, message, ...args );
	}
}

module.exports = EndpointExecutionError;
