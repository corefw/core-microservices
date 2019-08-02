/**
 * @file Defines the ServerlessClientExecutionContext class.
 *
 * @author Luke Chavers <luke@c2cschools.com>
 * @author Kevin Sanders <kevin@c2cschools.com>
 * @since 5.0.0
 * @license See LICENSE.md for details about licensing.
 * @copyright 2017 C2C Schools, LLC
 */

"use strict";

// Important Note
// --------------
// This module only loads a single dependency, directly, which is the
// parent class for the class defined within. This is intended to force
// dependency loading through the parent class, by way of the `$dep()`
// method, in order to centralize dependency definition and loading.

const LambdaInvokeExecutionContext = require(
	"./LambdaInvokeExecutionContext"
);

/**
 * Represents an execution context whereby an endpoint is executed on
 * AWS Lambda by way of a call through the `node-sls-client` library.
 *
 * @memberOf ExecutionContext
 * @extends ExecutionContext.LambdaInvokeExecutionContext
 */
class ServerlessClientExecutionContext extends LambdaInvokeExecutionContext {

	/*
	_resolveParameters() {

		// todo: finish this...
		super._resolveParameters();

	}

	_processInitialContextData() {

		// todo: look here
		// >>>> sessionToken = event._sls.sessionToken; <<<

		//const me 		= this;
		//let data 	= me.initialContextData;

		// todo: finish this...
		// Call Parent
		super._processInitialContextData();

		// Append environment variables to
		// the initialContextData object
		data.env = process.env;

		// Create the 'contextDataIndex'
		me._createContextDataIndex( data );

		// Process the context data index
		// for known patterns.
		me._resolveContextData();

		// Process for callback
		if( TIPE( data.callback ) === "function" ){
			me.setConfigValue( "callback", data.callback );
		}

		// Process for parameters
		me._resolveParameters();

	}

	_resolveContextData() {

		// todo: finish this...
		super._resolveContextData();

	}
	*/
}

module.exports = ServerlessClientExecutionContext;
