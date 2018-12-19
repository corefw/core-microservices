/**
 * @file Defines the ErrorResponse class.
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
 * This is the base class for all API error responses.
 *
 * @memberOf Response
 * @extends Response.BaseResponse
 */
module.exports = class ErrorResponse extends BaseResponse {

	/**
	 * @inheritDoc
	 *
	 * @param {?Error} [cfg.errorObject] - An error object represented in the
	 *     response.
	 */
	_initialize( cfg ) {

		const me = this;

		cfg.isError = true;

		// Call parent
		super._initialize( cfg );

		// Check for an error object
		if ( cfg.errorObject !== undefined && cfg.errorObject !== null ) {

			me.addErrorObject( cfg.errorObject );
			me.setConfigValue( "errorObject", null );
		}
	}

	/**
	 * Adds an error object to the response.
	 *
	 * @public
	 * @param {Error} err - The error to add
	 * @returns {void}
	 */
	addErrorObject( err ) {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		// Get the existing list of errors
		let errs = me.getConfigValue( "errorObjects", [] );

		// Ensure the list is an array
		if ( TIPE( errs ) !== "array" ) {

			errs = [];
		}

		// Add the new error
		errs.push( err );

		// Persist the list
		me.setConfigValue( "errorObjects", errs );

		// Do error parsing
		me._parseErrorObjects();
	}

	/**
	 * Stores one or more `Error` objects that will be represented in the
	 * response.
	 *
	 * Setting the value of this property will _append_ the error object
	 * collection, and will NOT overwrite it or remove any existing errors.
	 *
	 * @public
	 * @type {Error[]}
	 */
	get errorObjects() {

		const me = this;

		return me.getConfigValue( "errorObjects", [] );
	}

	set errorObjects( /** Error[] */ val ) {

		const me = this;

		me.setConfigValue( "errorObjects", val );
		me._parseErrorObjects();
	}

	// FIXME: properly documented?
	set errorObject( val ) {

		const me = this;

		me.addErrorObject( val );
	}

	/**
	 * The first error in the error object collection, or NULL if no errors
	 * exist within the collection.
	 *
	 * @public
	 * @type {?Error}
	 * @readonly
	 */
	get firstError() {

		const me = this;

		let errs = me.errorObjects;

		if ( errs[ 0 ] !== undefined ) {

			return errs[ 0 ];
		}

		return null;
	}

	/**
	 * Normalizes `Error` objects that are added to the internal error object
	 * collection.
	 *
	 * @private
	 * @returns {void} All modifications are made ByRef.
	 */
	_parseErrorObjects() {

		const me = this;

		let err = me.firstError;

		if ( err === null || err.statusCode === undefined ) {

			me.statusCode = 500;

		} else {

			me.statusCode = err.statusCode;
		}
	}

	/**
	 * Creates a JSON-API compatible scaffold for the response body [object].
	 *
	 * This method extends the `BaseResponse` scaffold by adding the error info.
	 *
	 * @private
	 * @returns {Object} Response body.
	 */
	_createResponseBody() {

		const me = this;

		let sBody	= super._createResponseBody();
		let desc	= me._getErrorDescriptions();

		sBody.errors = desc;

		return sBody;
	}

	/**
	 * Gets a plain-object representation for ALL of the errors within this
	 * Response's internal error object collection.
	 *
	 * @private
	 * @returns {Object[]} An array of error description objects.
	 */
	_getErrorDescriptions() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let ret = [];
		let errs = me.errorObjects;

		_.each( errs, function ( err ) {

			ret.push( me._getOneErrorDescription( err ) );
		} );

		return ret;
	}

	/**
	 * Gets a plain-object representation for a provided `Error`.
	 *
	 * @private
	 * @param {Error} err - The error to convert to a plain object.
	 *
	 * @returns {Object} Error description object.
	 */
	_getOneErrorDescription( err ) {

		const me = this;

		let apiStage = me.context.apiStage;

		let ret = {
			code   : 500,
			title  : "UnknownError",
			detail : "An unknown error has occurred.",
			url    : "http://developer.c2cschools.com/api/dev/errors/UnknownError.html",
		};

		if ( err.statusCode !== undefined ) {

			ret.code = err.statusCode;
		}

		if ( err.jse_cause !== undefined ) {

			ret.title = err.jse_cause.name;

		} else {

			ret.title = err.name;
		}

		if (
			ret.title === undefined ||
			ret.title === null ||
			ret.title === ""
		) {

			ret.title = "UnknownError";
		}

		// FIXME: apiStage in the URL here breaks validation against testing
		// data because it will be "mochaDev" for local testing, but something
		// like "dev" during CI testing.

		ret.detail	= err.message;
		ret.url		= "http://developer.c2cschools.com/api/" + apiStage + "/errors/" + ret.title + ".html";

		return ret;
	}
};
