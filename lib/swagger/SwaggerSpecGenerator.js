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

const SchemaGenerator = require( "../util/SchemaGenerator" );

/**
 * This class is used in the automatic generation of Swagger specifications
 * for the services during deployment and other Serverless Framework powered
 * operations.
 *
 * @memberOf Swagger
 * @extends Util.SchemaGenerator
 */
class SwaggerSpecGenerator extends SchemaGenerator {

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

		// Load the spec template
		let tpl = me.specTemplate;

		return me.buildSchema( tpl, dereference )
			.catch( function ( err ) {

				console.error( err );
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
module.exports = SwaggerSpecGenerator;
