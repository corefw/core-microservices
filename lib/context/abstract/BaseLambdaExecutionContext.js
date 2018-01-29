/**
 * @file Defines the BaseLambdaExecutionContext class.
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

const BaseExecutionContext = require( "./BaseExecutionContext" );

/**
 * Represents an execution context whereby an endpoint is executed on AWS
 * Lambda.
 *
 * @abstract
 * @memberOf ExecutionContext.Abstract
 * @extends ExecutionContext.BaseExecutionContext
 */
class BaseLambdaExecutionContext extends BaseExecutionContext {

}

module.exports = BaseLambdaExecutionContext;
