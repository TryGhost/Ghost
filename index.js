// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

const startTime = Date.now();
const debug = require('ghost-ignition').debug('boot:index');
// Sentry must be initialised early on
const sentry = require('./core/shared/sentry');

debug('First requires...');

const ghost = require('./core');

debug('Required ghost');

const express = require('./core/shared/express');
const logging = require('./core/shared/logging');
const urlService = require('./core/frontend/services/url');
// This is what listen gets called on, it needs to be a full Express App
const ghostApp = express('ghost');

// Use the request handler at the top level
// @TODO: decide if this should be here or in parent App - should it come after request id mw?
ghostApp.use(sentry.requestHandler);

debug('Initialising Ghost');

ghost().then(function (ghostServer) {
    // Mount our Ghost instance on our desired subdirectory path if it exists.
    ghostApp.use(urlService.utils.getSubdir(), ghostServer.rootApp);

    debug('Starting Ghost');
    // Let Ghost handle starting our server instance.
    return ghostServer.start(ghostApp)
        .then(function afterStart() {
            logging.info('Ghost boot', (Date.now() - startTime) / 1000 + 's');
        });
}).catch(function (err) {
    logging.error(err);
    setTimeout(() => {
        process.exit(-1);
    }, 100);
});
