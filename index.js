// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

var ghost,
    errors;

require('./core/server/overrides');

// Make sure dependencies are installed and file system permissions are correct.
require('./core/server/utils/startup-check').check();

// Proceed with startup
ghost = require('./core');
errors = require('./core/server/errors');

// Call Ghost to get an instance of GhostServer
ghost().then(function (ghostServer) {
    ghostServer.start();
}).catch(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});
