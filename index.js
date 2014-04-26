// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var ghost = require('./core'),
    errors = require('./core/server/errorHandling');

ghost().otherwise(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});