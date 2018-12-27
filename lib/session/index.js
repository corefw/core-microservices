/**
 * The 'Session' namespace contains classes related to sessions and session
 * management.
 *
 * @namespace Session
 */

"use strict";

/**
 * @typedef {Object} Session.TokenPayload
 * @property {?string} apiKey - API Key.
 * @property {Array<string>} flags - Flags.
 * @property {string} ns - Namespace.
 * @property {?string} personId - Person ID.
 * @property {string} sessionId - Session ID.
 * @property {?string} userId - User ID.
 * @property {?string} username - Username.
 * @property {number} v - Version.
 */

/**
 * @typedef {Object} Session.TokenConfig
 * @property {Session.TokenPayload} [data] - Token payload.
 * @property {string} sourceIp - Source IP address.
 * @property {number} [ttl] - Token expiration in seconds (TTL).
 * @property {?string} [userId] - User ID.
 */

/**
 * @typedef {Object} Session.TokenData
 * @property {Session.TokenPayload} [data] - Token payload.
 * @property {string} sourceIp - Source IP address.
 * @property {string} userId - User ID.
 */

module.exports = require( "requireindex" )( __dirname );
