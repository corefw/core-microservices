/* eslint-disable no-console */
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

// Debug for Warning: Possible EventEmitter memory leak detected. 11 exit listeners added.
// process.on( "warning", e => console.warn( e.stack ) );

// Say hello
console.log( "[auto-globals] Loading global unit testing tools & utilities... " );

// Init global utilities object
let _utils = {
	env   : {},
	libs  : {},
	paths : {},
};

/** @global */
global.utils = _utils;

// Load some basic settings from environment variables...
if ( process.env.ENDPOINT_TEST_TARGET === undefined ) {

	throw new Error(
		"Error in Mocha Test Helper (_mocha-endpoint-test-helper.js): The " +
		"variable ENDPOINT_TEST_TARGET is required, but was not provided."
	);
}

if ( process.env.ENDPOINT_PROJECT_PATH === undefined ) {

	throw new Error(
		"Error in Mocha Test Helper (_mocha-endpoint-test-helper.js): The " +
		"variable ENDPOINT_PROJECT_PATH is required, but was not provided."
	);

} else {

	_utils.env.endpointProjectPath = process.env.ENDPOINT_PROJECT_PATH;
}

// FIXME: this file is not based on BaseClass, so we can't use $dep() to get these
// FIXME: so is it ok to also include these in microservices dependencies?

// Dependencies
const EYES 					= require( "eyes" );
const TIPE 					= require( "tipe" );
const LODASH 				= require( "lodash" );
const CHAI					= require( "chai" );
const BLUEBIRD 				= require( "bluebird" );
const PATH					= require( "path" );
const EndpointTestHarness	= require( "./EndpointTestHarness" );

// We'll go ahead and allow some of the
// dependency modules to exist as globals.
// global._ 		= LODASH;
// global.tipe 	= TIPE;
global.expect	= CHAI.expect;

// Everything else will be accessible
// through the global 'utils' object.
_utils.libs = {
	eyes   		: EYES,
	tipe   		: TIPE,
	lodash 		: LODASH,
	chai   		: CHAI,
	bluebird	: BLUEBIRD,
	path   		: PATH,
};

// Resolve a few paths.
_utils.paths.project 	= _utils.env.endpointProjectPath;
_utils.paths.projectLib = PATH.join( _utils.paths.project, 		"lib" 									);
_utils.paths.endpoints 	= PATH.join( _utils.paths.projectLib, 	"endpoints" 							);
_utils.paths.models 	= PATH.join( _utils.paths.projectLib, 	"models" 								);
_utils.paths.tests 		= PATH.join( _utils.paths.project, 		"test" 									);
_utils.paths.coreMS		= PATH.join( _utils.paths.project, 		"node_modules/@corefw/microservices"	);
_utils.paths.toolsLib	= PATH.join( _utils.paths.coreMS, 		"lib" 									);
_utils.paths.testLibs	= PATH.join( _utils.paths.toolsLib, 	"test" 									);

// Resolve endpoint test target
if ( TIPE( process.env.ENDPOINT_TEST_TARGET ) === "string" ) {

	switch ( process.env.ENDPOINT_TEST_TARGET.toLowerCase() ) {

		case "local":
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...setting test target to 'local'." );
			_utils.env.endpointTestTarget = "local";
			break;

		case "dev":
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...setting test target to 'dev'." );
			_utils.env.endpointTestTarget = "dev";
			break;

		case "production":
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...setting test target to 'production'." );
			_utils.env.endpointTestTarget = "production";
			break;

		default:
			console.log( "[auto-globals] Found environment variable 'ENDPOINT_TEST_TARGET'..." );
			console.log( "[auto-globals]    ...but it had an invalid value..." );
			console.log( "[auto-globals]    ...defaulting test target to 'local'." );
			_utils.env.endpointTestTarget = "local";
			break;
	}

} else {

	console.log( "[auto-globals] Environment variable 'ENDPOINT_TEST_TARGET' not found..." );
	console.log( "[auto-globals]    ...defaulting test target to 'local'." );
	_utils.env.endpointTestTarget = "local";
}

// Pad the output log
console.log( " " );

/**
 * Creates and returns an EndpointTestHarness (from @corefw/microservices) that
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
_utils.createEndpointHarness = function ( cfg ) {

	// Default config
	if ( TIPE( cfg ) !== "object" ) {

		cfg = {};
	}

	// Resolve relative path, if provided.
	if ( cfg.relEndpointDirectoryPath !== undefined ) {

		if ( cfg.endpointDirectoryPath === undefined ) {

			// Resolve path
			cfg.endpointDirectoryPath = PATH.join(
				_utils.paths.endpoints,
				cfg.relEndpointDirectoryPath
			);
		}

		// This is not useful to the harness...
		delete cfg.relEndpointDirectoryPath;
	}

	// Set the testing mode.
	if ( cfg.testMode === undefined ) {

		cfg.testMode = _utils.env.endpointTestTarget;
	}

	// Load the harness
	return new EndpointTestHarness( cfg );
};
