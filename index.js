// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

var ghost = require('./core'),
    express = require('express'),
    errors = require('./core/server/errors'),
    parentApp = express();

// Make sure dependencies are installed and file system permissions are correct.
require('./core/server/utils/startup-check').check();

ghost().then(function (ghostServer) {
    // Mount our Ghost instance on our desired subdirectory path if it exists.
    parentApp.use(ghostServer.config.paths.subdir, ghostServer.rootApp);

    // Let Ghost handle starting our server instance.
    ghostServer.start(parentApp);
}).catch(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});
