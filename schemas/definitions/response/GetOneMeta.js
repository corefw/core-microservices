
"use strict";

module.exports = {
	"title"    : "MetaData",
	"type"     : "object",
	"required" : [
		"requestId",
		"seriesId",
		"operationId",
		"stage",
		"service",
	],
	"properties": {
		"allOf": [
			{
				"$ref": "common:response/StandardMetaProperties",
			},
		],
	},
};
