// # API routes
const debug = require('ghost-ignition').debug('api'),
    boolParser = require('express-query-boolean'),
    express = require('express'),

    // routes
    routes = require('./routes'),

    // Include the middleware

    // Shared
    cacheControl = require('../../../middleware/cache-control'), // global, shared
    maintenance = require('../../../middleware/maintenance'), // global, shared
    errorHandler = require('../../../middleware/error-handler'); // global, shared

module.exports = function setupApiApp() {
    debug('Content API v2 setup start');
    const apiApp = express();

    // @TODO finish refactoring this away.
    apiApp.use(function setIsAdmin(req, res, next) {
        // api === isAdmin
        res.isAdmin = true;
        next();
    });

    // API middleware

    // Query parsing
    apiApp.use(boolParser());

    // send 503 json response in case of maintenance
    apiApp.use(maintenance);

    // API shouldn't be cached
    apiApp.use(cacheControl('private'));

    // Routing
    apiApp.use(routes());

    // API error handling
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(errorHandler.handleJSONResponse);

    debug('Content API v2 setup end');

    return apiApp;
};
