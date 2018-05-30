
"use strict";

module.exports = {
	"$id"      : "#GetManyMeta",
	"title"    : "GetManyMeta",
	"type"     : "object",
	"required" : [
		"requestId",
		"seriesId",
		"operationId",
		"stage",
		"service",
		"pagination",
	],
	"allOf": [
		{
			"$ref": "common:response/StandardMetaProperties",
		},
		{
			"properties": {
				"pagination": {
					"$ref": "common:response/Pagination",
				},
			},
		},
	],
};
