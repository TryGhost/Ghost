// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

var ghost = require('./core'),
    express = require('express'),
    errors = require('./core/server/errors'),
    utils = require('./core/server/utils'),
    parentApp = express();

ghost().then(function (ghostServer) {
    // Mount our Ghost instance on our desired subdirectory path if it exists.
    parentApp.use(utils.url.getSubdir(), ghostServer.rootApp);

    // Let Ghost handle starting our server instance.
    ghostServer.start(parentApp);
}).catch(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});
