
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
	"allOf": [
		{
			"$ref": "common:response/StandardMetaProperties",
		},
	],
};
