/**
 * @file Defines the EnvironmentResolutionError class.
 */

"use strict";

const ContextDataError = require( "./abstract/ContextDataError" );

/**
 * This error is thrown whenever an endpoint fails to resolve its environment.
 *
 * @memberOf Errors
 * @extends Errors.Abstract.ContextDataError
 */
class EnvironmentResolutionError extends ContextDataError {

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

module.exports = EnvironmentResolutionError;
