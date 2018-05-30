
"use strict";

module.exports = {
	sort: {
		"name"     : "sort",
		"in"       : "query",
		"required" : false,
		"schema"   : {
			"type": "string",
		},
		"description": "Sort resource collections according to one or more " +
		"comma-separated (\",\") sort fields. The sort order for each sort " +
		"field will be ascending unless it is prefixed with a minus (\"-\"), " +
		"in which case it will be descending.",
	},
};
