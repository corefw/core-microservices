
"use strict";

module.exports = {
	"$id"        : "#StandardMetaProperties",
	"title"      : "StandardMetaProperties",
	"type"       : "object",
	"properties" : {
		"requestId": {
			"type"        : "string",
			"format"      : "uuid",
			"description" : "Current Request ID (UUID).",
		},
		"seriesId": {
			"type"        : "string",
			"format"      : "uuid",
			"description" : "Current Request Chain ID (UUID).",
		},
		"operationId": {
			"type"        : "string",
			"description" : "The internal name of the API endpoint that " +
			"generated this response.",
		},
		"stage": {
			"type"        : "string",
			"description" : "The API environment name.",
		},
		"service": {
			"title"      : "ServiceInformationMeta",
			"type"       : "object",
			"properties" : {
				"name": {
					"type"        : "string",
					"description" : "The service to which this API endpoint " +
					"belongs.",
				},
				"version": {
					"type"        : "string",
					"description" : "The current version of the service and " +
					"endpoint source code.",
				},
			},
		},
	},
};
