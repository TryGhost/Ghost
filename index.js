// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

var ghost = require('./core'),
    errors = require('./core/server/errors');

ghost().then(function (app) {
    app.start();
}).catch(function (err) {
    errors.logErrorAndExit(err, err.context, err.help);
});
