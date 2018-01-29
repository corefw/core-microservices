/**
 * This file creates a global object that provides a number of useful
 * tools and utilities for testing. It is loaded, automatically, by Mocha
 * (via the --require arg) and, therefore, does not need to be required.
 *
 * @module mocha-endpoint-test-helper
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @created 2017-09-01
 */

"use strict";

// Say hello
console.log( "[auto-globals] Loading global unit testing tools & utilities... " );

// Init global utilities object
let u = {
	env   : {},
	libs  : {},
	paths : {},
};

/** @global */
global.utils = u;

// Load some basic settings from environment variables...
if ( process.env.ENDPOINT_TEST_TARGET === undefined ) {

	throw new Error(
		"Error in Mocha Test Helper (mocha-endpoint-test-helper.js): The " +
		"variable ENDPOINT_TEST_TARGET is required, but was not provided."
	);
}

if ( process.env.ENDPOINT_PROJECT_PATH === undefined ) {

	throw new Error(
		"Error in Mocha Test Helper (mocha-endpoint-test-helper.js): The " +
		"variable ENDPOINT_PROJECT_PATH is required, but was not provided."
	);

} else {

	u.env.endpointProjectPath = process.env.ENDPOINT_PROJECT_PATH;
}

// Dependencies
let EYES 					= require( "eyes" );
const TIPE 					= require( "tipe" );
let LODASH 					= require( "lodash" );
let CHAI					= require( "chai" );
let BLUEBIRD 				= require( "bluebird" );
let PATH					= require( "path" );
let EndpointTestHarness		= require( "./EndpointTestHarness" );

// We'll go ahead and allow some of the
// dependency modules to exist as globals.
// global._ 		= LODASH;
// global.tipe 	= TIPE;
global.expect	= CHAI.expect;

// Everything else will be accessible
// through the global 'utils' object.
u.libs = {
	eyes   		: EYES,
	tipe   		: TIPE,
	lodash 		: LODASH,
	chai   		: CHAI,
	bluebird	: BLUEBIRD,
	path   		: PATH,
};

// Resolve a few paths.
u.paths.project 	= u.env.endpointProjectPath;
u.paths.projectLib 	= PATH.join( u.paths.project, 		"lib" 							);
u.paths.endpoints 	= PATH.join( u.paths.projectLib, 	"endpoints" 					);
u.paths.models 		= PATH.join( u.paths.projectLib, 	"models" 						);
u.paths.tests 		= PATH.join( u.paths.project, 		"test" 							);
u.paths.slsTools	= PATH.join( u.paths.project, 		"node_modules/@c2cs/sls-tools" 	);
u.paths.toolsLib	= PATH.join( u.paths.slsTools, 		"lib" 							);
u.paths.testLibs	= PATH.join( u.paths.toolsLib, 		"test" 							);

// Resolve endpoint test target
if ( TIPE( process.env.ENDPOINT_TEST_TARGET ) === "string" ) {

	switch ( process.env.ENDPOINT_TEST_TARGET.toLowerCase() ) {

		case "local":
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...setting test target to 'local'." );
			u.env.endpointTestTarget = "local";
			break;

		case "dev":
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...setting test target to 'dev'." );
			u.env.endpointTestTarget = "dev";
			break;

		case "production":
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...setting test target to 'production'." );
			u.env.endpointTestTarget = "production";
			break;

		default:
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...but it had an invalid value..." );
			console.log( "[auto-globals]    ...defaulting test target to 'local'." );
			u.env.endpointTestTarget = "local";
			break;
	}

} else {

	console.log( "[auto-globals] Environment variable 'ENDPOINT_TEST_TARGET' not found..." );
	console.log( "[auto-globals]    ...defaulting test target to 'local'." );
	u.env.endpointTestTarget = "local";
}

// Pad the output log
console.log( " " );

/**
 * Creates and returns an EndpointTestHarness (from sls-tools) that
 * can be used to test API endpoints.
 *
 * @public
 * @param {Object} cfg - Configuration object.
 * @param {string} cfg.relEndpointDirectoryPath - The path of the endpoint
 *     directory, relative from the "endpoints" directory in the project.
 * @param {string} cfg.dataDirectoryPath - An absolute path to the
 *     testing data.
 * @returns {EndpointTestHarness} The endpoint test harness.
 */
u.createEndpointHarness = function ( cfg ) {

	// Default config
	if ( TIPE( cfg ) !== "object" ) {

		cfg = {};
	}

	// Resolve relative path, if provided.
	if ( cfg.relEndpointDirectoryPath !== undefined ) {

		if ( cfg.endpointDirectoryPath === undefined ) {

			// Resolve path
			cfg.endpointDirectoryPath = PATH.join( u.paths.endpoints, cfg.relEndpointDirectoryPath );
		}

		// This is not useful to the harness...
		delete cfg.relEndpointDirectoryPath;
	}

	// Set the testing mode.
	if ( cfg.testMode === undefined ) {

		cfg.testMode = u.env.endpointTestTarget;
	}

	// Load the harness
	return new EndpointTestHarness( cfg );
};
