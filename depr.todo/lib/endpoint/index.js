/**
 * The 'Endpoint' namespace provides classes that represent the different types
 * of API endpoints.
 *
 * @namespace Endpoint
 */

"use strict";

/**
 * @typedef {Object} Endpoint.ContextData
 * @property {Event} event - The request information, including parameters,
 *     headers, and other variables related to the request. The contents and
 *     structure of this object will vary by run-time environment.
 * @property {Object} context - Context information, from the outside. The
 *     contents and structure of this object will vary by run-time
 *     environment.
 * @property {function} callback - An optional callback that will be called
 *     after the endpoint has executed successfully (or failed with an
 *     error)
 * @property {Object} package - The contents of the endpoint service's
 *     package.json file.
 */

module.exports = require( "requireindex" )( __dirname );
