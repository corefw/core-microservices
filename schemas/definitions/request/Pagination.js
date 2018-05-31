
"use strict";

module.exports = {
	pageNumber: {
		"name"     : "pageNumber",
		"in"       : "query",
		"required" : false,
		"schema"   : {
			"type"    : "integer",
			"format"  : "int32",
			"minimum" : 1,
			"default" : 1,
		},
		"description": "Specifies which page of result data " +
		"to return.",
	},
	pageSize: {
		"name"     : "pageSize",
		"in"       : "query",
		"required" : false,
		"schema"   : {
			"type"    : "integer",
			"format"  : "int32",
			"minimum" : 1,
			"maximum" : 200,
			"default" : 50,
		},
		"description": "Specifies the number of result " +
		"records to return per page.",
	},
};
