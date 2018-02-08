
"use strict";

const bs = require( "browser-sync" ).create();

bs.init( {
	server: {
		baseDir   : "./docs/html/latest",
		directory : false,
	},
	port         : 8080,
	watchEvents  : [ "add", "change" ],
	watchOptions : {
		ignoreInitial : true,
		usePolling    : true,
		interval      : 600,
	},
	ui: {
		port: 8081,
	},
	// files       : [ "./docs/html/latest/**/*" ],
	// files       : [ "./docs/html/latest" ],
	// logLevel     : "debug",
	files: [
		{
			match : [ "./docs/html/latest/**/*" ],
			fn    : function ( event, file ) {

				this.reload();
			},
		},
	],

	// Logging
	// logLevel       : "debug",
	// logConnections : true,
	// logFileChanges : true,

	open        : false,
	// reloadDebounce: 1000,
	// reloadThrottle: 4000,
	reloadDelay : 1500,
	notify      : false,
} );
