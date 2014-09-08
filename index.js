// # Ghost bootloader
// Orchestrates the loading of Ghost
// When run from command line.

try {
    var ghost = require('./core'),
        errors = require('./core/server/errors');

    ghost().then(function (app) {
        app.start();
    }).catch(function (err) {
        errors.logErrorAndExit(err, err.context, err.help);
    });
} catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND') {
        var moduleError = require('./core/server/errors/moduleerror');
        moduleError(e);
    }
}