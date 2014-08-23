// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var express = require('express'),
    ghost   = require('./core'),
    errors  = require('./core/server/errors');

// Create our parent express app instance.
var server = express();

ghost().then(function (instance) {
    // Mount our ghost instance on our desired subdirectory path if it exists.
    server.use(instance.config.paths.subdir, instance.app);

    // Let ghost handle starting our server instance.
    instance.start(server);
}).catch(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});
