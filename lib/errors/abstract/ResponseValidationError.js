/**
 * @file Defines the ResponseValidationError class.
 */

"use strict";

const ValidationError = require( "@corefw/core-common" )
	.errors.abstract.ValidationError;

/**
 * This error is thrown whenever a response object fails validation.
 *
 * @abstract
 * @memberOf Errors.Abstract
 * @extends Errors.Abstract.ValidationError
 */
class ResponseValidationError extends ValidationError {

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

module.exports = ResponseValidationError;

