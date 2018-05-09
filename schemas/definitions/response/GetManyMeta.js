
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
		"pagination",
	],
	"properties": {
		"allOf": [
			{
				"$ref": "common:response/StandardMetaProperties",
			},
			{
				"pagination": {
					"$ref": "common:response/Pagination",
				},
			},
		],
	},
};
