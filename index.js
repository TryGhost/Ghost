// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

const startTime = Date.now();
const debug = require('ghost-ignition').debug('boot:index');
const sentry = require('./core/server/sentry');

debug('First requires...');

const ghost = require('./core');

debug('Required ghost');

const express = require('express');
const common = require('./core/server/lib/common');
const urlService = require('./core/frontend/services/url');
const parentApp = express();

parentApp.use(sentry.requestHandler);

debug('Initialising Ghost');

ghost().then(function (ghostServer) {
    // Mount our Ghost instance on our desired subdirectory path if it exists.
    parentApp.use(urlService.utils.getSubdir(), ghostServer.rootApp);

    debug('Starting Ghost');
    // Let Ghost handle starting our server instance.
    return ghostServer.start(parentApp)
        .then(function afterStart() {
            common.logging.info('Ghost boot', (Date.now() - startTime) / 1000 + 's');
        });
}).catch(function (err) {
    common.logging.error(err);
    setTimeout(() => {
        process.exit(-1);
    }, 100);
});
