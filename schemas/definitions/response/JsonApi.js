
"use strict";

module.exports = {
	"title"       : "JSONAPIVersion",
	"type"        : "object",
	"description" : "JSON API implementation information.",
	"required"    : [
		"version",
	],
	"properties": {
		"version": {
			"type"        : "string",
			"description" :
				"The highest JSON API version supported by the server.",
		},
	},
};
