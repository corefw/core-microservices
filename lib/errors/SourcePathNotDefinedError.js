/**
 * @file Defines the SourcePathNotDefinedError class.
 */

"use strict";

const PathNotDefinedError = require( "@corefw/core-common" )
	.errors.PathNotDefinedError;

/**
 * This error is thrown whenever a path is defined as being relative to another
 * source path that, itself, has not been defined.
 *
 * @memberOf Errors
 * @extends Errors.Abstract.PathNotDefinedError
 */
class SourcePathNotDefinedError extends PathNotDefinedError {

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

module.exports = SourcePathNotDefinedError;
