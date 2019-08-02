/**
 * Defines the OpenApiSpecGenerator class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.1.15
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

const SchemaGenerator = require( "../util/SchemaGenerator" );

/**
 * This class is used in the automatic generation of OpenAPI specifications
 * for the services during deployment and other Serverless Framework powered
 * operations.
 *
 * @memberOf OpenAPI
 * @extends Util.SchemaGenerator
 */
class OpenApiSpecGenerator extends SchemaGenerator {

	/**
	 * The base template to use for generating OpenAPI specs.
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
	 * Loads the OpenAPI spec template, which will be used as the basis
	 * for generating service-level OpenAPI specs.
	 *
	 * @private
	 * @returns {Object} The base template to use for generating OpenAPI specs.
	 */
	_loadSpecTemplate() {

		const me = this;

		// Load the template
		return me._loadCommonSchemaFile(
			"openapi/spec-templates/" + me.configVariant + ".template.yml"
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
	 *     generated OpenAPI specification.
	 * @param {boolean} [dereference=true] - When TRUE, the final specification
	 *     will be completely dereferenced, making it as verbose as possible.
	 * @returns {Promise} A promise that is resolved after the destination
	 *     file has been written.
	 */
	writeToFile( absOutputPath, dereference ) {

		const me = this;

		// Dependencies
		const FS = me.$dep( "fs" );

		// First, build the OpenAPI spec
		return me.buildSpec( dereference ).then(

			function ( schema ) {

				// Stringify the generated OpenAPI spec
				let fc = JSON.stringify( schema, null, "\t" );

				// Defer to the `fs` module to write the file...
				FS.writeFileSync( absOutputPath, fc, {
					encoding: "utf-8",
				} );

				// FIXME: Should any classes that extend the BaseClass use me.$log instead?

				/* eslint-disable no-console */
				// Output some basic information to stdout...
				console.log( " " );
				console.log( "OpenApiSpecGenerator: Wrote " + fc.length + " bytes to '" + absOutputPath + "'" );
				console.log( " " );
				/* eslint-enable no-console */
			}
		);
	}

	/**
	 * Generates an OpenAPI specification.
	 *
	 * @public
	 * @param {boolean} [dereference=true] - When TRUE, the final specification
	 *     will be completely dereferenced, making it as verbose as possible.
	 * @returns {Promise} A promise that is resolved with the full, final,
	 *     service-level OpenAPI specification (as an object).
	 */
	buildSpec( dereference ) {

		const me = this;

		// Load the spec template
		let tpl = me.specTemplate;

		return me.buildSchema( tpl, dereference )
			.catch( function ( err ) {

				// FIXME: Should any classes that extend the BaseClass use me.$log instead?

				/* eslint-disable no-console */
				console.error( err );
				/* eslint-enable no-console */
			} );
	}

	/**
	 * @inheritDoc
	 */
	_loadSchema( path ) {

		const toOpenApi = require( "json-schema-to-openapi-schema" );

		let schema = super._loadSchema( path );

		if ( schema.$id ) {

			schema = toOpenApi( schema );
		}

		return schema;
	}
}

// Export the class
module.exports = OpenApiSpecGenerator;
