/**
 * @file Defines the SessionManger class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseClass = require( "@corefw/common" ).common.BaseClass;
const ERRORS	= require( "../errors" );

/**
 * This utility class stores, manages, and manipulates user session information
 * and JWT web tokens.
 *
 * @memberOf Session
 * @extends Common.BaseClass
 */
class SessionManager extends BaseClass {

	/**
	 * The endpoint for which this SessionManager is managing the session for.
	 *
	 * @public
	 * @type {Endpoint.BaseEndpoint}
	 * @default null
	 */
	get endpoint() {

		const me = this;

		return me.getConfigValue( "endpoint", null );
	}

	set endpoint( /** Endpoint.BaseEndpoint */ val ) {

		const me = this;

		me.setConfigValue( "endpoint", val );
		val.$adopt( me );
	}

	/**
	 * The secret key used to encode and decode session tokens.
	 *
	 * @public
	 * @type {string}
	 */
	get tokenSecret() {

		const me = this;

		return me.getConfigValue( "tokenSecret", "SoSecretlySecret" );
	}

	// noinspection JSUnusedGlobalSymbols
	set tokenSecret( /** string */ val ) {

		const me = this;

		me.setConfigValue( "tokenSecret", val );
	}

	/**
	 * Validates the user session and token, as needed.
	 * This method is usually called by an endpoint.
	 *
	 * @public
	 * @throws {Errors.MissingSessionTokenError} if a token is required but not
	 *     found.
	 * @throws {Errors.InvalidSessionTokenError} if a token is provided but is
	 *     invalid.
	 * @throws {Errors.ExpiredSessionTokenError} if the provided token has
	 *     expired.
	 * @param {Request.Request} request - An endpoint/context Request object.
	 * @returns {Promise.<Request.Request>} A promise, resolved with the
	 *     provided 'Request' object, unless session validation fails. If
	 *     validation fails, then errors will be THROWN and should be caught
	 *     higher up in the chain.
	 */
	validateRequest( request ) {

		const me = this;

		// Dependencies
		const BB = me.$dep( "bluebird" );

		let ep 		= me.endpoint;
		let token 	= me._getTokenFromRequest( request );

		// If the endpoint doesn't require a session,
		// we can skip validation all together.
		if ( !ep.requireSession ) {

			return BB.resolve( request );
		}

		// Step 1 - Ensure that a token was provided (if required)
		if ( ep.requireSession ) {

			me._ensureTokenExists( token );
		}

		// Step 2 - Ensure that the token is valid

		let tokenData;

		if ( token !== null ) {

			tokenData = me._ensureTokenIsValid( token );
		}

		// Step 3 - Ensure that the token has not expired
		if (
			token !== null &&
			request.context.ignoreTokenExpiration === false
		) {

			me._ensureTokenHasNotExpired( token );
		}

		// Persist the token data to the request
		if ( token !== null && tokenData !== undefined ) {

			request.tokenData = tokenData;
			me._applySessionValuesToLogger( tokenData, request );
		}

		// Finished...
		return BB.resolve( request );
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Applies session/token information to a {@link Logging.Logger} object so
	 * that the data is included in the logs.
	 *
	 * @private
	 * @param {Session.TokenData} tokenData - The data extracted from a session
	 *     token.
	 * @param{Request.Request} request - The current request object (this is
	 *     used to resolve the `Logger` from the current `ExecutionContext`).
	 * @returns {void}
	 */
	_applySessionValuesToLogger( tokenData, request ) {

		let logger = request.context.logger;

		// Skip if we don't have a logger
		if ( logger === null ) {

			return;
		}

		// For convenience
		let lvals = logger._config.instance.values;

		// Apply values...
		lvals.session.sessionId 		= tokenData.data.sessionId;
		lvals.session.namespace 		= tokenData.data.ns;
		lvals.session.token.clientIp 	= tokenData.sourceIp;
		lvals.session.token.flags 		= tokenData.data.flags;
		lvals.session.token.version 	= tokenData.data.v;
		lvals.user.personId 			= tokenData.data.personId;
		lvals.user.username 			= tokenData.data.username;
		lvals.user.userId 				= tokenData.data.userId;
	}

	/**
	 * Extracts the session token from a {@link Request.Request} object.
	 *
	 * @private
	 * @param {Request.Request} request - The request object from which to
	 *     extract the session token.
	 * @returns {?string} The encoded session token, as a string.
	 */
	_getTokenFromRequest( request ) {

		const me = this;

		// Dependencies
		const _		= me.$dep( "lodash" );
		const TIPE	= me.$dep( "tipe" );

		let token = request.context.sessionToken;

		if ( token !== null ) {

			if ( token === undefined ) {

				token = null;

			} else if ( TIPE( token ) === "string" ) {

				if ( _.trim( token ).length === 0 ) {

					token = null;
				}
			}

			return token;
		}

		if ( request.context.useDevelopmentToken ) {

			return me._generateDevelopmentToken( request );
		}

		return null;
	}

	// noinspection JSMethodCanBeStatic
	/**
	 * Ensures that a Request contains a session token and
	 * throws an error if it does not.
	 *
	 * @private
	 * @throws {Errors.MissingSessionTokenError} if a token could not be found.
	 * @param {?string} token - A session token.
	 * @returns {void} This method simply throws an error if the provided
	 *     token is NULL or empty.
	 */
	_ensureTokenExists( token ) {

		// const me = this;

		if ( token === null ) {

			throw new ERRORS.MissingSessionTokenError(
				"Access Denied: This endpoint requires a valid and active " +
				"session token, but one was not provided in the request."
			);
		}
	}

	/**
	 * Ensures that a session token is valid.
	 *
	 * @private
	 * @throws {Errors.InvalidSessionTokenError} if the provided token is
	 *     invalid.
	 * @param {string} token - A session token.
	 * @returns {Session.TokenData} The decoded token contents.
	 */
	_ensureTokenIsValid( token ) {

		const me = this;

		// Dependencies
		const JWT = me.$dep( "jwt" );
		// const ERRORS	= me.$dep( "errors" );

		let decoded;

		try {

			decoded = JWT.verify(
				token,
				me.tokenSecret,
				{
					ignoreExpiration: true,
				}
			);

			// todo: perhaps more validation of the token contents?

		} catch ( err ) {

			throw new ERRORS.InvalidSessionTokenError(
				"Access Denied: The provided session token is not valid, is " +
				"malformed, or has been altered."
			);
		}

		return decoded;
	}

	/**
	 * Ensures that a session token has not expired.
	 *
	 * @private
	 * @throws {Errors.ExpiredSessionTokenError} if the provided token has
	 *     expired.
	 * @param {string} token - A session token.
	 * @returns {void} This method simply throws an error if the provided
	 *     token has expired.
	 */
	_ensureTokenHasNotExpired( token ) {

		const me = this;

		// Dependencies
		const JWT = me.$dep( "jwt" );
		// const ERRORS	= me.$dep( "errors" );

		try {

			JWT.verify(
				token,
				me.tokenSecret,
				{
					ignoreExpiration: false,
				}
			);

		} catch ( err ) {

			throw new ERRORS.InvalidSessionTokenError(
				"Access Denied: The provided session token is valid, but has " +
				"expired. Please acquire a new token by renewing your " +
				"session or by creating a new session."
			);
		}
	}

	/**
	 * Generates a new session token when provided a payload ('cfg').
	 *
	 * @private
	 * @param {Session.TokenConfig} cfg - The token payload config (and TTL).
	 * @param {Request.Request} request - A Request object that is used to
	 *     inject execution context data into the relevant parts of the token
	 *     payload.
	 * @returns {string} A new JWT token.
	 */
	_generateToken( cfg, request ) {

		const me = this;

		// Dependencies
		const _		= me.$dep( "lodash" );
		const TIPE	= me.$dep( "tipe" );
		const JWT	= me.$dep( "jwt" );

		let ttl;

		// Param defaults
		if ( TIPE( cfg ) !== "object" ) {

			cfg = {};
		}

		if ( TIPE( cfg.data ) !== "object" ) {

			cfg.data = {};
		}

		// TTL
		if ( cfg.ttl !== undefined ) {

			ttl = parseInt( cfg.ttl, 10 );

		} else {

			ttl = 3600;
		}

		// Remove TTL from the cfg
		// (if it is in there)
		delete cfg.ttl;

		// Clamp TTL
		ttl = _.clamp( ttl, 0, 43200 );

		// Apply values from the execution context
		cfg.data.apiKey 	= request.context.apiKey;
		cfg.sourceIp 		= request.context.clientIp;

		// Generate the Token
		return JWT.sign(
			cfg,
			me.tokenSecret,
			{
				expiresIn: ttl,
			}
		);
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Generates a universal JWT token that represents a 'public'
	 * API user (someone who is visiting our public website).
	 *
	 * @private
	 * @param {Request.Request} request - A Request object that is used to
	 *     inject execution context data into the relevant parts of the token
	 *     payload.
	 * @returns {string} A new JWT token.
	 */
	_generatePublicToken( request ) {

		const me = this;

		return me._generateToken( me.publicTokenConfig, request );
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Generates a universal JWT token that represents the 'system'
	 * API user. This special user represents our internal systems and
	 * infrastructure and, for the most part, has unlimited access rights.
	 *
	 * @private
	 * @param {Request.Request} request - A Request object that is used to
	 *     inject execution context data into the relevant parts of the token
	 *     payload.
	 * @returns {string} A new JWT token.
	 */
	_generateSystemToken( request ) {

		const me = this;

		return me._generateToken( me.systemTokenConfig, request );
	}

	/**
	 * Generates a universal JWT token that represents a 'development'
	 * API user. This special user represents a developer working on the
	 * API and, for the most part, has unlimited access rights.
	 *
	 * @private
	 * @param {Request.Request} request - A Request object that is used to
	 *     inject execution context data into the relevant parts of the token
	 *     payload.
	 * @returns {string} A new JWT token.
	 */
	_generateDevelopmentToken( request ) {

		const me = this;

		return me._generateToken( me.developmentTokenConfig, request );
	}

	/**
	 * An empty/default session token object. This object is used as
	 * the scaffold for building session token objects.
	 *
	 * @public
	 * @type {Session.TokenConfig}
	 * @readonly
	 */
	get defaultTokenConfig() {

		const me = this;

		// Dependencies
		const uuidUtils = me.$dep( "util/uuid" );

		// noinspection UnnecessaryLocalVariableJS
		let tokenConfig = {
			ttl      : 3600,
			userId   : null,
			sourceIp : "0.0.0.0",
			data     : {
				username  : null,
				userId    : null,
				personId  : null,
				v         : 1,
				sessionId : uuidUtils.generate(),
				flags     : [],
				ns        : "default",
				apiKey    : null,
			},
		};

		return tokenConfig;
	}

	/**
	 * A session token object pre-filled with data that represents
	 * the "public" (unauthenticated) user.
	 *
	 * @public
	 * @type {Session.TokenConfig}
	 * @readonly
	 */
	get publicTokenConfig() {

		const me = this;

		let cfg	= me.defaultTokenConfig;

		cfg.userId 			= "ba0b55a6-a4b1-e13c-2138-96a92faf32d2";
		cfg.data.username 	= "public";
		cfg.data.userId 	= cfg.userId;
		cfg.data.personId 	= "e34b3aff-29a5-6dfc-5f08-317b9f8cfe2b";

		cfg.data.flags.push( "public" );
		cfg.data.flags.push( "unauthorized" );

		return cfg;
	}

	/**
	 * A session token object pre-filled with data that represents
	 * the "system" user, which more-or-less has unlimited access rights.
	 *
	 * @public
	 * @type {Session.TokenConfig}
	 * @readonly
	 */
	get systemTokenConfig() {

		const me = this;

		let cfg	= me.defaultTokenConfig;

		cfg.userId			= "258c39ee-d4c1-3b92-71a0-fc661f0cd951";
		cfg.data.username 	= "system";
		cfg.data.userId 	= cfg.userId;
		cfg.data.personId 	= "870a6a03-3488-7138-bb76-15db850dee6a";

		cfg.data.flags.push( "system" );

		return cfg;
	}

	/**
	 * A session token object pre-filled with data that represents
	 * a developer, which more-or-less has unlimited access rights.
	 *
	 * @public
	 * @type {Session.TokenConfig}
	 * @readonly
	 */
	get developmentTokenConfig() {

		const me = this;

		let cfg	= me.systemTokenConfig;

		cfg.data.flags.push( "development" );

		return cfg;
	}
}

module.exports = SessionManager;
