/**
 * @file Defines the BaseResponse class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseClass = require( "@corefw/core-common" ).common.BaseClass;

/**
 * This is the base class for all API responses.
 *
 * @abstract
 * @memberOf Response
 * @extends Common.BaseClass
 */
module.exports = class BaseResponse extends BaseClass {

	/**
	 * Stores a reference to the {@link Request.Request} object that this
	 * object is being used to respond to.
	 *
	 * @public
	 * @type {Request.Request}
	 * @default null
	 */
	get request() {

		const me = this;

		return me.getConfigValue( "request", null );
	}

	set request( /** Request.Request */ val ) {

		const me = this;

		me.setConfigValue( "request", val );
	}

	/**
	 * A reference to the current execution context.
	 *
	 * @public
	 * @type {ExecutionContext.BaseExecutionContext}
	 * @readonly
	 */
	get context() {

		const me = this;

		if ( me.request === null ) {

			return null;
		}

		return me.request.context;
	}

	/**
	 * The data portion of the response.
	 *
	 * @public
	 * @type {Object}
	 * @default {}
	 */
	get data() {

		const me = this;

		return me.getConfigValue( "data", {} );
	}

	set data( /** Object */ val ) {

		const me = this;

		me.setConfigValue( "data", val );
	}

	/**
	 * The endpoint that is responding.
	 *
	 * @public
	 * @type {?Endpoint.BaseEndpoint}
	 * @default null
	 */
	get endpoint() {

		const me = this;

		return me.getConfigValue( "endpoint", null );
	}

	set endpoint( /** ?Endpoint.BaseEndpoint */ val ) {

		const me = this;

		me.setConfigValue( "endpoint", val );
	}

	/**
	 * The operationId (class name) of the endpoint that is responding.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 */
	get operationId() {

		const me = this;

		if ( me.endpoint === null ) {

			return null;
		}

		return me.endpoint.operationId;
	}

	/**
	 * The name of the service in which the responding endpoint resides.
	 *
	 * @public
	 * @type {?string}
	 * @readonly
	 */
	get serviceName() {

		const me = this;

		if ( me.endpoint === null ) {

			return null;
		}

		return me.endpoint.serviceName;
	}

	/**
	 * The version of the service in which the responding endpoint resides.
	 *
	 * @public
	 * @type {?string}
	 * @readonly
	 */
	get serviceVersion() {

		const me = this;

		if ( me.endpoint === null ) {

			return null;
		}

		return me.endpoint.serviceVersion;
	}

	/**
	 * The primary model of the responding endpoint.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 */
	get primaryModel() {

		const me = this;

		return me.getConfigValue( "primaryModel", null );
	}

	// noinspection JSUnusedGlobalSymbols
	set primaryModel( /** ?string */ val ) {

		const me = this;

		me.setConfigValue( "primaryModel", val );
	}

	/**
	 * The status code of this response, which should correlate to an
	 * Http status code.
	 *
	 * @public
	 * @type {number}
	 * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
	 * @default 200
	 */
	get statusCode() {

		const me = this;

		return me.getConfigValue( "statusCode", 200 );
	}

	set statusCode( /** number */ val ) {

		const me = this;

		me.setConfigValue( "statusCode", val );
	}

	/**
	 * The body of the response.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get body() {

		const me = this;

		return me._createResponseBody();
	}

	/**
	 * The body of the response, serialized into a JSON string.
	 *
	 * @public
	 * @type {string}
	 * @readonly
	 */
	get strBody() {

		const me = this;

		return JSON.stringify( me.body );
	}

	/**
	 * The http headers that should be included in the response if the client
	 * is invoking this endpoint by way of an http API or proxy.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get headers() {

		const me = this;

		return {
			"x-series-uuid": me.seriesId,
		};
	}

	/**
	 * The seriesId (which is a UUID) for this response. This is mirror/alias
	 * of {@link ExecutionContext.BaseExecutionContext#seriesId}.
	 *
	 * @public
	 * @type {?string}
	 * @readonly
	 */
	get seriesId() {

		const me = this;

		if ( me.context === null ) {

			return null;
		}

		return me.context.seriesId;
	}

	/**
	 * The requestId (which is a UUID) for this response. This is mirror/alias
	 * of {@link ExecutionContext.BaseExecutionContext#requestId}.
	 *
	 * @public
	 * @type {?string}
	 * @readonly
	 */
	get requestId() {

		const me = this;

		if ( me.context === null ) {

			return null;
		}

		return me.context.requestId;
	}

	/**
	 * The api stage for this response. This is mirror/alias of
	 * {@link ExecutionContext.BaseExecutionContext#apiStage}.
	 *
	 * @public
	 * @type {?string}
	 * @readonly
	 */
	get apiStage() {

		const me = this;

		if ( me.context === null ) {

			return null;
		}

		return me.context.apiStage;
	}

	/**
	 * Indicates whether or not this response represents an error.
	 *
	 * @public
	 * @type {boolean}
	 * @default false
	 */
	get isError() {

		const me = this;

		return me.getConfigValue( "isError", false );
	}

	// noinspection JSUnusedGlobalSymbols
	set isError( /** boolean */ val ) {

		const me = this;

		me.setConfigValue( "isError", val );
	}

	/**
	 * Returns a plain object representation of this response object.
	 *
	 * @public
	 * @param {string} [bodyProperty="strBody"] - Indicates how the body should
	 *     be formatted within the returned object.
	 * @returns {{statusCode: *, headers: *, body: *}} Plain object
	 *     representation of this response object.
	 */
	toPlainObject( bodyProperty ) {

		const me = this;

		if ( bodyProperty !== "body" ) {

			bodyProperty = "strBody";
		}

		return {
			statusCode : me.statusCode,
			headers    : me.headers,
			body       : me[ bodyProperty ],
		};
	}

	/**
	 * Serializes this collection into a JSON-API compatible object.
	 *
	 * @private
	 * @returns {Object} JSON-API compatible object.
	 */
	_serializeToJsonApiObject() {

		const me = this;

		return me.toPlainObject( "strBody" );
	}

	/**
	 * Creates a JSON-API compatible scaffold for the response body [object].
	 *
	 * @private
	 * @returns {Object} Response body.
	 */
	_createResponseBody() {

		const me = this;

		return {
			jsonapi: {
				version: "1.0",
			},
			meta: {
				requestId  	: me.requestId,
				seriesId   	: me.seriesId,
				operationId	: me.operationId,
				stage       : me.apiStage,
				service     : {
					name    : me.endpoint.serviceName,
					version	: me.endpoint.serviceVersion,
				},
			},
		};
	}
};
