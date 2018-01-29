/**
 * Defines the SwaggerSpecGenerator class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.1.15
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const BaseGenerator	= require( "../util/BaseGenerator" );
const REF_PARSER	= require( "json-schema-ref-parser" );

/**
 * This class is used in the automatic generation of Swagger specifications
 * for the services during deployment and other Serverless Framework powered
 * operations.
 *
 * @memberOf Swagger
 * @extends Util.BaseGenerator
 */
class SwaggerSpecGenerator extends BaseGenerator {

	/**
	 * The base template to use for generating Swagger specs.
	 *
	 * @see _loadSpecTemplate
	 * @public
	 * @type {Object}
	 * @readonly
	 */
	get specTemplate() {

		const me = this;

		return me._loadSpecTemplate();
	}

	/**
	 * Loads the Swagger spec template, which will be used as the basis
	 * for generating service-level Swagger specs.
	 *
	 * @private
	 * @returns {Object} The base template to use for generating Swagger specs.
	 */
	_loadSpecTemplate() {

		const me = this;

		// Load the template
		return me._loadCommonSchemaFile(
			"swagger/spec-templates/" + me.configVariant + ".template.json"
		);
	}

	/**
	 * Calls the `buildSpec` method and writes the results, as a JSON string,
	 * to a provided absolute file path.
	 *
	 * This is the most typical entry point for this generators logic...
	 *
	 * @public
	 * @param {string} absOutputPath - The target file path to write the
	 *     generated Swagger specification.
	 * @param {boolean} [dereference=true] - When TRUE, the final specification
	 *     will be completely dereferenced, making it as verbose as possible.
	 * @returns {Promise} A promise that is resolved after the destination
	 *     file has been written.
	 */
	writeToFile( absOutputPath, dereference ) {

		const me = this;

		// Dependencies
		const FS = me.$dep( "fs" );

		// First, build the Swagger spec
		return me.buildSpec( dereference ).then(

			function ( schema ) {

				// Stringify the generated Swagger spec
				let fc = JSON.stringify( schema, null, "\t" );

				// Defer to the `fs` module to write the file...
				FS.writeFileSync( absOutputPath, fc, {
					encoding: "utf-8",
				} );

				// Output some basic information to stdout...
				console.log( " " );
				console.log( "SwaggerSpecGenerator: Wrote " + fc.length + " bytes to '" + absOutputPath + "'" );
				console.log( " " );
			}
		);
	}

	/**
	 * Generates a Swagger specification.
	 *
	 * @public
	 * @param {boolean} [dereference=true] - When TRUE, the final specification
	 *     will be completely dereferenced, making it as verbose as possible.
	 * @returns {Promise} A promise that is resolved with the full, final,
	 *     service-level swagger specification (as an object).
	 */
	buildSpec( dereference ) {

		const me = this;
		let rpMethod;

		// Load the spec template
		let tpl = me.specTemplate;

		// Figure out which method to use on the schema ref parser
		if ( dereference === false ) {

			rpMethod = "bundle";

		} else {

			rpMethod = "dereference";
		}

		// Defer to the `json-schema-ref-parser` module for processing.
		return REF_PARSER[ rpMethod ]( tpl, me._refParserConfig )
			.catch( function ( err ) {

				console.error( err );
			} );
	}

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

					// A regular expression that tell the $ref parser
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

		let url = file.url;
		let path = null;
		let refType = null;
		let resolverMethod = null;

		// Determine the fundamental $ref type and remove
		// the type from the path string.
		// e.g. common:response/Response -> response/Response
		if ( _.startsWith( url, "service:" ) ) {

			refType = "Service";
			path = url.substr( 8 );

		} else if ( _.startsWith( url, "common:" ) ) {

			refType = "Common";
			path = url.substr( 7 );

		} else if ( _.startsWith( url, "endpoint:" ) ) {

			refType = "Endpoint";
			path = url.substr( 9 );

		} else if ( _.startsWith( url, "endpoints:" ) ) {

			refType = "Endpoint";
			path = url.substr( 10 );
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
				console.log( "An error occurred in the SwaggerSpecGenerator's custom $ref resolver.\n" );
				console.log( err );
				console.log( "\n\n\n" );
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
	 * the `node-sls-common` library's `schemas/definitions` directory.
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
		"$ref" : "common:error/ErrorModel"
		*/

		const me = this;

		// Dependencies
		const PATH = me.$dep( "path" );

		let absPath;
		let ret;

		try {

			// Resolve the absolute path to the common schema file
			absPath = PATH.join( me.commonSchemaDefinitionRoot, path ) +
				".json";

			// Load the common schema file
			ret = require( absPath );

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
	 * from the `schemas` sub-directory within the endpoint's root directory.
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
		const PATH = me.$dep( "path" );

		// Split up the 'path' so that we can resolve
		// and remove the endpoint name from it.
		let spl = path.split( "/" );

		// Capture the endpoint name...
		let endpointNameLC = spl.shift();

		// The remaining path parts constitute a relative
		// path within the endpoint's `schemas` directory
		let relPath = spl.join( "/" );

		// Find the details of the target endpoint; we need to
		// find the absolute path of the endpoint's schemas.
		let epDetails = me.getServiceEndpoint( endpointNameLC );

		// Error if the endpoint was not found
		if ( epDetails === null ) {

			throw new Error(
				"Invalid or unrecognized 'Endpoint' $ref path: " +
				"'" + path + "' (No such endpoint)"
			);
		}

		// Resolve the absolute path to the endpoint schema file
		let epSchemaRoot = epDetails.schemaRootPath;
		let absPath = PATH.join( epSchemaRoot, relPath ) + ".json";

		// Load the file and return it as an object
		return require( absPath );
	}

	/**
	 * Builds an object that contains the `paths` data from every endpoint
	 * in the service.
	 *
	 * The schema object returned by this method is available within any
	 * schema parsed by this generator as `{ "$ref": "service:EndpointPaths" }`,
	 * which should always exist, somewhere, within service-level Swagger
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

		_.each( epd, function ( data, endpointName ) {

			if ( _.isPlainObject( data.pathConfig ) ) {

				_.each( data.pathConfig, function ( pathData, pathName ) {

					ret[ pathName ] = pathData;
				} );
			}
		} );

		return ret;
	}
}

// Export the class
module.exports = SwaggerSpecGenerator;
