/**
 * @file Defines the Request class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseClass	= require( "@corefw/core-common" ).common.BaseClass;
const ERRORS	= require( "../errors" );

/**
 * Represents an API request.
 *
 * @memberOf Request
 * @extends Common.BaseClass
 */
class Request extends BaseClass {

	/**
	 * @inheritDoc
	 */
	initialize( cfg ) {

		const me = this;

		// Call parent
		super.initialize( cfg );

		// Validate params (if we have them)
		me._validateParameters();
	}

	/**
	 * The {@link ExecutionContext.BaseExecutionContext} that built this
	 * Request object.
	 *
	 * @public
	 * @type {?ExecutionContext.BaseExecutionContext}
	 * @default null
	 */
	get context() {

		const me = this;

		return me.getConfigValue( "context", null );
	}

	set context( /** ?ExecutionContext.BaseExecutionContext */ val ) {

		const me = this;

		val.$adopt( me );
		me.setConfigValue( "context", val );
	}

	/**
	 * The raw parameter data passed in by the client, which does not
	 * include any schema information about the parameter.
	 *
	 * @public
	 * @type {?Object}
	 * @default null
	 */
	get rawParameters() {

		const me = this;

		return me.getConfigValue( "rawParameters", null );
	}

	set rawParameters( /** ?Object */ val ) {

		const me = this;

		me.setConfigValue( "rawParameters", val );
		me._validateParameters();
	}

	/**
	 * The fully resolved parameter information, which includes schema
	 * information and the current value of each parameter.
	 *
	 * This method will return ALL parameters, even if the client did not
	 * specify a value for it and the parameter does not have a default
	 * value.
	 *
	 * @public
	 * @type {?Object}
	 * @readonly
	 * @default null
	 */
	get parameters() {

		const me = this;

		return me.getConfigValue( "parameters", null );
	}

	/**
	 * The fully resolved parameter information, which includes schema
	 * information and the current value of each parameter.
	 *
	 * This method will only return parameters that have values, which includes
	 * parameters that had values passed in by the client OR those that were
	 * not passed in by the client but have default values defined.
	 *
	 * @public
	 * @type {?Object}
	 * @readonly
	 * @default null
	 */
	get parametersWithValues() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let params = me.parameters;
		let ret = {};

		if ( params === null ) {

			return null;
		}

		_.each( params, function ( p, key ) {

			if ( p.hasValue ) {

				ret[ key ] = p;
			}
		} );

		return ret;
	}

	/**
	 * A plain object containing parameters and their values.
	 *
	 * This method will only return parameters that have values, which includes
	 * parameters that had values passed in by the client OR those that were
	 * not passed in by the client but have default values defined.
	 *
	 * @public
	 * @type {Object}
	 * @readonly
	 * @default {}
	 */
	get parameterValues() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let params = me.parametersWithValues;
		let ret = {};

		_.each( params, function ( v, k ) {

			ret[ k ] = v.value;
		} );

		return ret;
	}

	/**
	 * The endpoint that this Request was submitted to.
	 *
	 * @public
	 * @type {?Endpoint.BaseEndpoint}
	 * @default null
	 * @readonly
	 */
	get endpoint() {

		const me = this;

		if ( me.context === null ) {

			return null;
		}

		return me.context.endpoint;
	}

	/**
	 * The request schema for the endpoint that this request was submitted to.
	 *
	 * @public
	 * @type {?Object}
	 * @readonly
	 * @default null
	 */
	get schema() {

		const me = this;

		if ( me.endpoint === null ) {

			return null;
		}

		return me.endpoint.requestSchema;
	}

	/**
	 * The primary model of the endpoint that this request was submitted to.
	 *
	 * @public
	 * @type {?Model.BaseModel}
	 * @readonly
	 * @default null
	 */
	get model() {

		const me = this;

		if ( me.endpoint === null ) {

			return null;
		}

		return me.endpoint.model;
	}

	/**
	 * The encoded session token used in this Request. This will either be
	 * passed in by the client or generated (for some special purpose) by the
	 * {@link Session.SessionManager}.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 */
	get token() {

		const me = this;

		return me.getConfigValue( "token", null );
	}

	set token( /** ?string */ val ) {

		const me = this;

		me.setConfigValue( "token", val );
	}

	/**
	 * The decoded data from the session token used in this Request. This will
	 * either be passed in by the client or generated (for some special purpose)
	 * by the {@link Session.SessionManager}.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 */
	get tokenData() {

		const me = this;

		return me.getConfigValue( "tokenData", null );
	}

	set tokenData( /** ?string */ val ) {

		const me = this;

		me.setConfigValue( "tokenData", val );
	}

	/**
	 * The username of the client making the request, which is extracted from
	 * the session token.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get username() {

		const me = this;

		if ( me.tokenData === null ) {

			return null;
		}

		return me.tokenData.data.username;
	}

	/**
	 * The userId (which is a UUID) of the client making the request, which is
	 * extracted from the session token.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get userId() {

		const me = this;

		if ( me.tokenData === null ) {

			return null;
		}

		return me.tokenData.userId;
	}

	/**
	 * The personId (which is a UUID) of the client making the request, which is
	 * extracted from the session token.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get personId() {

		const me = this;

		if ( me.tokenData === null ) {

			return null;
		}

		return me.tokenData.data.personId;
	}

	/**
	 * The sessionId (which is a UUID) of the client's session, which is
	 * extracted from the session token.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get sessionId() {

		const me = this;

		if ( me.tokenData === null ) {

			return null;
		}

		return me.tokenData.data.sessionId;
	}

	/**
	 * The namespace of the client's session, which is extracted from the
	 * session token.
	 *
	 * Currently, this is not used, but exists for future compatibility with
	 * a planned extension of the MSA architecture that will make it more
	 * versatile and reusable.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get namespace() {

		const me = this;

		if ( me.tokenData === null ) {

			return "default";
		}

		return me.tokenData.data.ns;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * The version of the session token's format, which is extracted from the
	 * session token.
	 *
	 * @public
	 * @type {?number}
	 * @default null
	 * @readonly
	 */
	get tokenVersion() {

		const me = this;

		if ( me.tokenData === null ) {

			return null;
		}

		return me.tokenData.data.v;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * The ip address of the requesting client, which is extracted from the
	 * session token.
	 *
	 * Because this value is extracted from the session token, the ip address
	 * will be that of the client that created the session, which is not
	 * necessarily the same ip address as the client making this, specific,
	 * request.
	 *
	 * @public
	 * @type {?string}
	 * @default null
	 * @readonly
	 */
	get tokenClientIp() {

		const me = this;

		if ( me.tokenData === null ) {

			return null;
		}

		return me.tokenData.sourceIp;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Session flags for the current session, which is extracted from the
	 * session token.
	 *
	 * Session flags are used in special processing logic, especially logic
	 * related to access control. For example, tokens with the "system" flag
	 * will (for the most part) bypass ACM checks.
	 *
	 * Session flags are also persisted to each log event emitted by endpoints,
	 * which can be useful for various types of analysis.
	 *
	 * @public
	 * @type {string[]}
	 * @default []
	 * @readonly
	 */
	get tokenFlags() {

		const me = this;

		if ( me.tokenData === null ) {

			return [ "no-token" ];
		}

		return me.tokenData.data.flags;
	}

	/**
	 * This method will convert the rawParameters, which is a plain object,
	 * one dimensional object, into a more standardized object that includes
	 * schema information. The information added by this process may
	 * be useful to other validators and parameter parsers that exist
	 * in other parts of the application.
	 *
	 * @private
	 * @returns {void} This method stores its results internally as the
	 *     'parameters' property.
	 */
	_normalizeRawParameters() {

		const me = this;

		// Dependencies
		const TIPE	= me.$dep( "tipe" );
		const _		= me.$dep( "lodash" );

		let params 		= me.rawParameters;
		let schema 		= me.schema;
		let normalized = {};

		// Skip normalization if we're missing the
		// parameters or the schema...
		if ( params === null || schema === null ) {

			return;
		}

		if ( schema.properties === undefined ) {

			return;
		}

		// Iterate over the parameters defined within the schema.
		_.each( schema.properties, function ( paramSchema, paramKey ) {

			let p = normalized[ paramKey ] = {
				hasValue     : false,
				value        : null,
				provided     : false,
				hasDefault   : false,
				defaultValue : null,
				key          : paramKey,
				schema       : paramSchema,
			};

			// Create a few meta fields related to defaults
			if ( p.schema.default !== undefined ) {

				p.hasDefault = true;
				p.defaultValue = paramSchema.default;
			}

			// Apply the param value, if it was provided...
			if ( params[ paramKey ] !== undefined ) {

				p.provided = true;
				p.value = params[ paramKey ];
				p.hasValue = true;
			}

			// Apply defaults, as applicable
			if ( !p.hasValue && p.hasDefault ) {

				p.value = p.defaultValue;
				p.hasValue = true;
			}

			// Additional parsing for certain field types...
			if ( p.hasValue ) {

				if ( TIPE( p.schema.format ) === "string" ) {

					switch ( p.schema.format.toLowerCase() ) {

						case "uuid":
						case "uuid-plus":
							me._normalizeUuidParamValue( p );
							break;

						default:
							break;
					}
				}

				if ( TIPE( p.schema.type ) === "string" ) {

					switch ( p.schema.type.toLowerCase() ) {

						case "integer":
							me._normalizeIntegerParamValue( p );
							break;

						default:
							break;
					}
				}
			}
		} );

		// Persist
		me.setConfigValue( "parameters", normalized );
	}

	/**
	 * This is a helper method for the `#_normalizeRawParameters()` method,
	 * which normalizes the value for UUID fields, when they'r provided.
	 *
	 * @private
	 * @param {Object} paramInfoObject - An object describing a parameter, its
	 *     schema, and its value.
	 * @returns {void} All modifications are made ByRef
	 */
	_normalizeUuidParamValue( paramInfoObject ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );
		// const ERRORS	= me.$dep( "errors" );

		let val = paramInfoObject.value;
		let final = [];
		let isUuidPlus = false;

		// Check for "plus" designation, which
		// will loosen the validation rules to
		// allow for non-uuid values.
		if ( paramInfoObject.schema.format === "uuid-plus" ) {

			isUuidPlus = true;

			// For UUID plus fields, it may also be helpful
			// for us to keep track of the values that are
			// valid UUIDs.
			paramInfoObject.uuidsAt = [];
		}

		// Check for commas...
		if ( val.indexOf( "," ) !== -1 ) {

			val = val.split( "," );

		} else {

			// No commas, but...
			// We're going to force it to an array anyway,
			// so that the next steps will be easier.
			val = [ val ];
		}

		// Make all values unique...
		val = _.uniq( val );

		// Normalize each UUID
		_.each( val, function ( unparsed ) {

			// Trimming couldn't hurt...
			unparsed = _.trim( unparsed );

			// Ignore blanks...
			if ( unparsed !== "" ) {

				// Create a parsed value,
				// ...which should be all lower case
				let parsed = unparsed.toLowerCase();

				// ...and without non-uuid characters.
				parsed = parsed.replace( /[^a-f0-9]/g, "" );

				// Validate...
				if ( parsed.length !== 32 ) {

					// This isn't a valid UUID.
					// Let's see if we're allowing them.

					if ( isUuidPlus ) {

						// We're allowing non-uuids, so, we'll
						// just try to preserve this value as it
						// was before we parsed anything.
						final.push( unparsed );

					} else {

						// We're not allowing non-UUID values, so
						// this is a validation error...
						throw new ERRORS.common.InvalidParameterError(
							"Invalid request parameter '" + paramInfoObject.key + "': Invalid string format (expected UUID)"
						);
					}

				} else {

					// This looks like a proper UUID (though there is,
					// admittedly, a small chance for screw-ups here,
					// I will address it later...)

					// todo: scrutinize the value more closely to ensure that it is a UUID

					// Insert dashes...
					parsed =
						parsed.substr( 0, 8 ) + "-" +
						parsed.substr( 8, 4 ) + "-" +
						parsed.substr( 12, 4 ) + "-" +
						parsed.substr( 16, 4 ) + "-" +
						parsed.substr( 20 );

					// Track this as a valid UUID
					if ( isUuidPlus ) {

						paramInfoObject.uuidsAt.push( final.length );
					}

					final.push( parsed );
				}
			}
		} );

		// If we have an empty array after processing, then we'll
		// count this parameter as not being provided...
		if ( final.length === 0 ) {

			paramInfoObject.hasValue	= false;
			paramInfoObject.value		= null;
			paramInfoObject.provided	= false;
			paramInfoObject.uuidsAt		= [];

		} else if ( final.length === 1 ) {

			// If there's only one value, we'll convert it back to a string
			paramInfoObject.value = final[ 0 ];

		} else {

			// Otherwise, just store it...
			paramInfoObject.value = final;
		}
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * This is a helper method for the `#_normalizeRawParameters()` method,
	 * which normalizes the value for integer fields, when they'r provided.
	 *
	 * @private
	 * @param {Object} paramInfoObject - An object describing a parameter, its
	 *     schema, and its value.
	 * @returns {void} All modifications are made ByRef
	 */
	_normalizeIntegerParamValue( paramInfoObject ) {

		let val = paramInfoObject.value;

		// First, cast to a string...
		val = String( val );

		// Remove decimals (if they exist)
		if ( val.indexOf( "." ) !== -1 ) {

			let spl = val.split( "." );

			val = spl[ 0 ];
		}

		// Remove invalid characters
		val = val.replace( /[^0-9]/g, "" );

		// Cast back to a number
		val = parseInt( val, 10 );

		// Save it
		paramInfoObject.value = val;
	}

	/**
	 * This is the main entry point for parameter validation
	 * against a predefined request schema. This method will be called
	 * whenever the 'rawParameters' of this Request object are updated.
	 *
	 * @private
	 * @throws UnrecognizedParameterError, MissingParameterError, InvalidParameterError
	 * @see https://github.com/geraintluff/tv4
	 * @see http://json-schema.org/latest/json-schema-validation.html
	 * @returns {void} This method (or its subsidiaries) will throw errors if
	 *     parameter validation fails; otherwise, nothing is returned.
	 */
	_validateParameters() {

		const me = this;

		// Dependencies
		const Validator = me.$dep( "util/Validator" );

		// Normalize first...
		me._normalizeRawParameters();

		// Create a Validator object
		let validator = new Validator(
			{
				obj        : me.parameterValues,
				schema     : me.schema,
				skipIfNull : true,
			}
		);

		// Execute it...
		validator.validate();
	}
}

module.exports = Request;
