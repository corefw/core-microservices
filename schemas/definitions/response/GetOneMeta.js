
"use strict";

module.exports = {
	"$id"      : "#GetOneMeta",
	"title"    : "GetOneMeta",
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
