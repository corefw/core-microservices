
"use strict";

module.exports = {
	"$id"        : "#Pagination",
	"title"      : "Pagination",
	"type"       : "object",
	"properties" : {
		"allRecordsReturned": {
			"type"        : "boolean",
			"description" : "Whether or not ALL available records, based on " +
			"the request parameters provided, were returned in the result " +
			"data. This will be true if the page size (`pageSize`) is larger " +
			"than the total number of records available (`totalRecords`).",
		},
		"currentPage": {
			"type"        : "integer",
			"description" : "The page number that was returned (the first " +
				"page is number 1).",
		},
		"pageSize": {
			"type"        : "integer",
			"description" : "The number of records returned for each page.",
		},
		"totalPages": {
			"type"        : "integer",
			"description" : "The total number of pages available based on " +
			"the request parameters provided.",
		},
		"recordsReturned": {
			"type"        : "integer",
			"description" : "The number of records returned in the result " +
			"data; this will always be the same as 'pageSize' on all pages " +
			"except the last, which might include fewer records.",
		},
		"firstRecordIndex": {
			"type"        : "integer",
			"description" : "The zero-based index of the first record " +
			"returned in the result data.",
		},
		"lastRecordIndex": {
			"type"        : "integer",
			"description" : "The zero-based index of the last record " +
			"returned in the result data.",
		},
		"totalRecords": {
			"type"        : "integer",
			"description" : "The total number of records available based on " +
			"the request parameters provided.",
		},
	},
};
