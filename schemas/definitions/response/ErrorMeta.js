
"use strict";

module.exports = {
	"$id"      : "#ErrorMeta",
	"title"    : "ErrorMeta",
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
