
"use strict";

module.exports = {
	"$id"      : "#DeleteOneMeta",
	"title"    : "DeleteOneMeta",
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
