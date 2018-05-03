/**
 * The 'Errors' namespace provides custom error classes that are used throughout
 * the project to provide meaningful information about the various errors that
 * can occur.
 *
 * @namespace Errors
 */

"use strict";

module.exports = {
	ContextDataResolutionError  : require( "./ContextDataResolutionError" ),
	EndpointExecutionError      : require( "./EndpointExecutionError" ),
	EnvironmentResolutionError  : require( "./EnvironmentResolutionError" ),
	ExpiredSessionTokenError    : require( "./ExpiredSessionTokenError" ),
	InvalidContextKeyError      : require( "./InvalidContextKeyError" ),
	InvalidSessionTokenError    : require( "./InvalidSessionTokenError" ),
	MissingParameterSchemaError : require( "./MissingParameterSchemaError" ),
	MissingResponseSchemaError  : require( "./MissingResponseSchemaError" ),
	MissingSessionTokenError    : require( "./MissingSessionTokenError" ),
	ModelRequiredError          : require( "./ModelRequiredError" ),
	RequestValidationError      : require( "./RequestValidationError" ),
	ResponseValidationError     : require( "./ResponseValidationError" ),
	SourcePathNotDefinedError   : require( "./SourcePathNotDefinedError" ),
};
