/**
 * @file Defines the ContextDataResolutionError class.
 */

"use strict";

const ContextDataError = require( "./abstract/ContextDataError" );

/**
 * This error is thrown when a required context data value cannot be resolved.
 *
 * @memberOf Errors
 * @extends Errors.Abstract.ContextDataError
 */
class ContextDataResolutionError extends ContextDataError {

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

module.exports = ContextDataResolutionError;
