/**
 * Defines the SchemaSpecGenerator class.
 *
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.1.5
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseGenerator	= require( "../util/BaseGenerator" );
const REF_PARSER	= require( "json-schema-ref-parser" );

/**
 * This class is used in the automatic generation of schema.
 *
 * @memberOf Util
 * @extends Util.BaseGenerator
 */
class SchemaGenerator extends BaseGenerator {

	/**
	 * The configuration that will be passed to the `json-schema-ref-parser`.
	 *
	 * @private
	 * @type {Object}
	 * @readonly
	 */
	get _refParserConfig() {

		const me = this;

		// Build the config
		return {

			// Tells the resolver not to automatically parse JSON.
			// (this might be unnecessary and might be removed)
			parse: {
				json: false,
			},

			// $ref resolution config...
			resolve: {

				// Add a custom resolve (see `_customRefResolver()`)
				customResolver: {

					// Ensure our custom parser is given the
					// highest priority; it will be called FIRST,
					// for each $ref that matches the `canRead` regex.
					order: 1,

					// A regular expression that tells the $ref parser
					// to forward specific $ref values to our custom
					// resolver function (`_customRefResolver`).
					canRead: /^(common|endpoints?|service):/i,

					// Pass in a reference to our custom resolver
					read: me._customRefResolver.bind( me ),
				},
			},
		};
	}

	/**
	 * A custom $ref resolver for the `json-schema-ref-parser` module.
	 *
	 * @see https://github.com/BigstickCarpet/json-schema-ref-parser/blob/master/docs/plugins/resolvers.md
	 * @private
	 * @param {Object} file - Information about the $ref value.
	 * @param {string} file.url - The actual $ref string value, minus any
	 *     property references (e.g. `#/path/etc`)
	 * @returns {Object} The resolved schema part.
	 */
	_customRefResolver( file ) {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let url				= file.url;
		let path			= null;
		let refType			= null;
		let resolverMethod	= null;

		// Determine the fundamental $ref type and remove
		// the type from the path string.
		// e.g. common:response/Response -> response/Response
		if ( _.startsWith( url, "service:" ) ) {

			refType	= "Service";
			path	= url.substr( 8 );

		} else if ( _.startsWith( url, "common:" ) ) {

			refType	= "Common";
			path	= url.substr( 7 );

		} else if ( _.startsWith( url, "endpoint:" ) ) {

			refType	= "Endpoint";
			path	= url.substr( 9 );

		} else if ( _.startsWith( url, "endpoints:" ) ) {

			refType	= "Endpoint";
			path	= url.substr( 10 );
		}

		// If the $ref type is valid, we'll defer
		// to a more specific method
		if ( refType !== null ) {

			// Find the specialist method for the $ref type...
			// e.g. refType = "common"
			// use the `_resolveCommonRef` method...
			resolverMethod = "_resolve" + refType + "Ref";

			// Call the specialist method

			try {

				let specRes = me[ resolverMethod ]( path );

				return specRes;

			} catch ( err ) {

				console.log( "\n\n\n" );
				console.log( "An error occurred in the SchemaGenerator's custom $ref resolver.\n" );
				console.log( err );
				console.log( "\n\n\n" );

				return {};
			}

		} else {

			// If the $ref type is not valid, or not recognized,
			// we'll return an empty object.
			return {};
		}
	}

	/**
	 * A specialist resolver for $ref values that start with "service:".
	 * This method is a helper for, and is called exclusively by, the
	 * `_customRefResolver` method.
	 *
	 * @see _customRefResolver
	 * @private
	 * @param {string} path - The $ref value, with the $ref type removed.
	 * @returns {Object} The resolved schema object.
	 */
	_resolveServiceRef( path ) {

		/*
		Valid Reference Examples
		------------------------
		"$ref": "service:Package#/version"
		"$ref": "service:Package#/author"
		"$ref": "service:EndpointPaths"
		*/

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		if ( path === "package" ) {

			// service:Package refers to values within the services' package.json
			return require( PATH.join( me.serviceRootPath, "package.json" ) );

		} else if ( path === "endpointpaths" ) {

			// service:EndpointPaths refers to the special object created
			// by the `_buildEndpointPaths` method.

			return me._buildEndpointPaths();
		}

		// throw an error for anything else...
		throw new Error(
			"Invalid or unrecognized 'Service' $ref path: " +
			"'" + path + "'"
		);
	}

	/**
	 * A specialist resolver for $ref values that start with "common:".
	 * This method is a helper for, and is called exclusively by, the
	 * `_customRefResolver` method.
	 *
	 * $refs of the "common" type will load common schema files from
	 * the `core-microservices` library's `schema/definitions` directory.
	 *
	 * @see _customRefResolver
	 * @private
	 * @param {string} path - The $ref value, with the $ref type removed.
	 * @returns {Object} The resolved schema object.
	 */
	_resolveCommonRef( path ) {

		/*
		Valid Reference Examples
		------------------------
		"$ref" : "common:response/ErrorResponse"
		*/

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		let absPath;
		let ret;

		try {

			// Resolve the absolute path to the common schema file
			absPath = PATH.join( me.commonSchemaDefinitionRoot, path + ".yml" );

			// Load the common schema file
			ret = me._loadSchema( absPath );

		} catch ( err ) {

			// Throw an error if the file is not found
			throw new Error(
				"Invalid or unrecognized 'Common' $ref path: " +
				"'" + path + "' (File Not Found)"
			);
		}

		// Return the common schema
		return ret;
	}

	/**
	 * A specialist resolver for $ref values that start with "endpoint:".
	 * This method is a helper for, and is called exclusively by, the
	 * `_customRefResolver` method.
	 *
	 * $refs of the "endpoint" type will load endpoint-specific schema files
	 * from the `schema` sub-directory within the endpoint's root directory.
	 *
	 * @see _customRefResolver
	 * @private
	 * @param {string} path - The $ref value, with the $ref type removed.
	 * @returns {Object} The resolved schema object.
	 */
	_resolveEndpointRef( path ) {

		/*
		Valid Reference Examples
		------------------------
		"$ref" : "endpoint:getmanyactivities/SuccessResponse"
		*/

		const me = this;

		// Dependencies
		const PATH	= me.$dep( "path" );
		const _		= me.$dep( "lodash" );

		// Split up the 'path' so that we can resolve
		// and remove the endpoint name from it.
		let spl = path.split( "/" );

		// Capture the endpoint name...
		let endpointName = spl.shift();

		if ( _.isNil( endpointName ) || endpointName === "" ) {

			endpointName = spl.shift();
		}

		// The remaining path parts constitute a relative
		// path within the endpoint's `schema` directory
		let relPath = spl.join( "/" );

		// Find the details of the target endpoint; we need to
		// find the absolute path of the endpoint's schema.
		let epDetails = me.getServiceEndpoint( endpointName );

		// Error if the endpoint was not found
		if ( epDetails === null ) {

			throw new Error(
				"Invalid or unrecognized 'Endpoint' $ref path: " +
				"'" + path + "' (No such endpoint)"
			);
		}

		// Resolve the absolute path to the endpoint schema file
		let epSchemaRoot = epDetails.schemaRootPath;
		let absPath = PATH.join( epSchemaRoot, relPath + ".yml" );

		// Load the file and return it as an object
		return me._loadSchema( absPath );
	}

	/**
	 * Builds an object that contains the `paths` data from every endpoint
	 * in the service.
	 *
	 * The schema object returned by this method is available within any
	 * schema parsed by this generator as `{ "$ref": "service:EndpointPaths" }`,
	 * which should always exist, somewhere, within service-level OpenAPI
	 * templates.
	 *
	 * @private
	 * @returns {Object} An object containing the `paths` from every endpoint.
	 */
	_buildEndpointPaths() {

		const me = this;

		// Dependencies
		const _ = me.$dep( "lodash" );

		let epd = me.getServiceEndpoints( false );
		let ret = {};

		_.each( epd, function ( data ) {

			if ( _.isPlainObject( data.pathConfig ) ) {

				_.each( data.pathConfig, function ( pathData, pathName ) {

					ret[ pathName ] = pathData;
				} );
			}
		} );

		return ret;
	}

	/**
	 * Loads the schema file at the specified path.
	 *
	 * @param {string} path - Schema path
	 * @returns {Object} The loaded schema object.
	 * @private
	 */
	_loadSchema( path ) {

		const me = this;

		return me._loadYamlFile( path );
	}

	/**
	 * Generates an OpenAPI specification.
	 *
	 * @public
	 * @param {string|Object} rootSchema - Root schema file/object.
	 * @param {boolean} [dereference=true] - When TRUE, the final specification
	 *     will be completely dereferenced, making it as verbose as possible.
	 * @returns {Promise} A promise that is resolved with the full schema
	 *     (as an object).
	 */
	buildSchema( rootSchema, dereference ) {

		const me = this;

		// Dependencies
		const TIPE = me.$dep( "tipe" );

		let rpMethod;

		// Figure out which method to use on the schema ref parser
		if ( dereference === false ) {

			rpMethod = "bundle";

		} else {

			rpMethod = "dereference";
		}

		if ( TIPE( rootSchema ) === "string" ) {

			rootSchema = me._loadSchema( rootSchema );
		}

		// Defer to the `json-schema-ref-parser` module for processing.
		return REF_PARSER[ rpMethod ]( rootSchema, me._refParserConfig );
	}
}

// Export the class
module.exports = SchemaGenerator;
