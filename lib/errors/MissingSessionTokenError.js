/**
 * @file Defines the MissingSessionTokenError class.
 */

"use strict";

const SessionTokenError = require( "./abstract/SessionTokenError" );

/**
 * This error is thrown whenever a session token is required, but cannot be
 * found.
 *
 * @memberOf Errors
 * @extends Errors.Abstract.SessionTokenError
 */
class MissingSessionTokenError extends SessionTokenError {

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

module.exports = MissingSessionTokenError;
