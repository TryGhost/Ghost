// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.
var ghost = require('./core'),
    debug = require('debug')('ghost:boot:index'),
    express = require('express'),
    logging = require('./core/server/logging'),
    errors = require('./core/server/errors'),
    utils = require('./core/server/utils'),
    parentApp = express();

debug('Initialising Ghost');
ghost().then(function (ghostServer) {
    // Mount our Ghost instance on our desired subdirectory path if it exists.
    parentApp.use(utils.url.getSubdir(), ghostServer.rootApp);

    debug('Starting Ghost');
    // Let Ghost handle starting our server instance.
    ghostServer.start(parentApp);
}).catch(function (err) {
    logging.error(new errors.GhostError({err: err}));
    process.exit(0);
});
