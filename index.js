// # Ghost Startup
// Orchestrates the startup of Ghost when run from command line.

var startTime = Date.now(),
    debug = require('ghost-ignition').debug('boot:index'),
    ghost, express, common, urlService, parentApp;

debug('First requires...');

ghost = require('./core');

debug('Required ghost');

express = require('express');
common = require('./core/server/lib/common');
urlService = require('./core/server/services/url');
parentApp = express();

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
