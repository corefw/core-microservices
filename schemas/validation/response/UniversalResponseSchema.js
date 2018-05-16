
"use strict";

module.exports = {
	"$id"         : "UniversalResponseSchema",
	"description" : "This JSON schema describes the required schema for ALL " +
	"endpoints, regardless of their type and whether or not the request was " +
	"successful.",
	"type"       : "object",
	"properties" : {
		"jsonapi": {
			"$ref": "JsonApi",
		},
		"meta": {
			"$ref": "UniversalResponseMeta",
		},
	},
};
