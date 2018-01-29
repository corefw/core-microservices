/**
 * @file Defines the LambdaInvokeExecutionContext class.
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

const BaseLambdaExecutionContext = require(
	"./abstract/BaseLambdaExecutionContext"
);

/**
 * Represents an execution context whereby an endpoint is executed on
 * AWS Lambda by way of an direct Lambda invocation.
 *
 * @memberOf ExecutionContext
 * @extends ExecutionContext.BaseLambdaExecutionContext
 */
class LambdaInvokeExecutionContext extends BaseLambdaExecutionContext {

}

module.exports = LambdaInvokeExecutionContext;
