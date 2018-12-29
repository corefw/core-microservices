/**
 * @file Defines the BaseHttpExecutionContext class.
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

const BaseLambdaExecutionContext = require( "./BaseLambdaExecutionContext" );

/**
 * Represents an execution context whereby an endpoint is
 * executed through an HTTP proxy (or API).
 *
 * @abstract
 * @memberOf ExecutionContext.Abstract
 * @extends ExecutionContext.BaseLambdaExecutionContext
 */
class BaseHttpExecutionContext extends BaseLambdaExecutionContext {

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Resolves the request parameters from all available context data.
	 * This method overrides the `BaseExecutionContext`'s logic in a way that
	 * is more appropriate for http-based execution contexts.
	 *
	 * @private
	 * @returns {void} All modifications are made, ByRef, to the rawParameters
	 *     property.
	 */
	_resolveParameters() {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		let ev = me.initialContextData.event;

		// TODO: Add support for headers, stageVariables, multiValueHeaders and multiValueQueryStringParameters?

		// Force defaults
		if ( TIPE( ev.queryStringParameters ) !== "object" ) {

			ev.queryStringParameters = {};
		}

		if ( TIPE( ev.pathParameters ) !== "object" ) {

			ev.pathParameters = {};
		}

		// FIXME: Is this a legacy AAG property?

		// AAG queryString
		// if ( TIPE( ev.querystring ) === "object" ) {
		//
		// 	ev.queryStringParameters = Object.assign(
		// 		ev.queryStringParameters,
		// 		ev.querystring
		// 	);
		// }

		let rawParameters = me.getRawParameters();

		// Concatenate all of the param types

		rawParameters = Object.assign(
			rawParameters,
			ev.queryStringParameters,
			ev.pathParameters
		);

		me.setRawParameters( rawParameters );

		/*
		console.log("\n \n \n ");
		console.log("-- Parameters --");
		console.log( me.rawParameters );
		console.log("\n \n \n ");
		*/

		// console.log("--me.rawParameters--");
		// console.log( me.rawParameters );
	}

	/**
	 * @inheritDoc
	 */
	_resolveRequestBody() {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		let ev = me.initialContextData.event;

		if ( TIPE( ev.body ) === "string" ) {

			ev.body = JSON.parse( ev.body );

		} else if ( TIPE( ev.body ) !== "object" ) {

			ev.body = {};
		}

		return me.setRequestBody( ev.body );
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * This method will do a few basic normalization steps to
	 * the initial context data, before it is processed, to
	 * increase/improve consistency.
	 *
	 * @private
	 * @returns {void} All modifications are made ByRef.
	 */
	_normalizeInitialContextData() {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		let data = me.initialContextData;

		// Headers...
		let hSingular 	= data.event.header;
		let hPlural		= data.event.headers;

		if ( TIPE( hSingular ) !== "object" ) {

			hSingular = {};
		}

		if ( TIPE( hPlural ) !== "object" ) {

			hPlural = {};
		}

		data.event.headers = Object.assign( {}, hPlural, hSingular );
		delete data.event.header;

		// Todo: _sls ?

		// Call parent
		super._normalizeInitialContextData();
	}
}

module.exports = BaseHttpExecutionContext;
