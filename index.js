// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var express = require('express'),
    ghost   = require('./core'),
    errors  = require('./core/server/errors'),
    // Create our parent express app instance.
    parentApp = express();

ghost().then(function (ghostServer) {
    // Mount our ghost instance on our desired subdirectory path if it exists.
    parentApp.use(ghostServer.config.paths.subdir, ghostServer.rootApp);

    // Let ghost handle starting our server instance.
    ghostServer.start(parentApp);
}).catch(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});
