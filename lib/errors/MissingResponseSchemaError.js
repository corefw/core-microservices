/**
 * @file Defines the MissingResponseSchemaError class.
 */

"use strict";

const MissingSchemaError = require( "@corefw/core-common")
	.errors.abstract.MissingSchemaError;

/**
 * This error is thrown whenever a schema object/document is expected in order
 * to validate a response, but cannot be found.
 *
 * @memberOf Errors
 * @extends Errors.Abstract.MissingSchemaError
 */
class MissingResponseSchemaError extends MissingSchemaError {

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

module.exports = MissingResponseSchemaError;
