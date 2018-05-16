
"use strict";

module.exports = {
	"$id"         : "ErrorResponse",
	"description" : "Error Response",
	"type"        : "object",
	"required"    : [
		"meta",
		"jsonapi",
		"errors",
	],
	"properties": {
		"jsonapi": {
			"$ref": "common:response/JsonApi",
		},
		"meta": {
			"$ref": "common:response/ErrorMeta",
		},
		"errors": {
			"type"  : "array",
			"items" : {
				"type"     : "object",
				"required" : [
					"code",
					"title",
					"detail",
					"url",
				],
				"properties": {
					"code": {
						"type"        : "string",
						"description" : "HTTP status code applicable to this " +
						"problem.",
					},
					"title": {
						"type"        : "string",
						"description" : "Short, human-readable summary of " +
						"the problem.",
					},
					"detail": {
						"type"        : "string",
						"description" : "Human-readable explanation specific " +
						"to this occurrence of the problem.",
					},
					"url": {
						"type": "string",
					},
				},
			},
		},
	},
};
