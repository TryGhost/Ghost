// # API routes
const debug = require('ghost-ignition').debug('api');
const boolParser = require('express-query-boolean');
const express = require('express');

// routes
const routes = require('./routes');

// Include the middleware

// Shared
const cacheControl = require('../../../shared/middlewares/cache-control'); // global, shared
const maintenance = require('../../../shared/middlewares/maintenance'); // global, shared
const errorHandler = require('../../../shared/middlewares/error-handler'); // global, shared

module.exports = function setupApiApp() {
    debug('Content API v2 setup start');
    const apiApp = express();

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
