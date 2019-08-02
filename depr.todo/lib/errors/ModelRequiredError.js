/**
 * @file Defines the ModelRequiredError class.
 */

"use strict";

const ModelError = require( "@corefw/model" )
	.errors.abstract.ModelError;

/**
 * Thrown whenever an endpoint does not specify a model.
 *
 * @memberOf Errors
 * @extends Errors.Abstract.ModelError
 */
class ModelRequiredError extends ModelError {

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

module.exports = ModelRequiredError;
