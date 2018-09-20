// # API routes
const debug = require('ghost-ignition').debug('api');
const boolParser = require('express-query-boolean');
const express = require('express');

// routes
const routes = require('./routes');

// Include the middleware

// API specific
const versionMatch = require('../../../middleware/api/version-match'); // global

// Shared
const bodyParser = require('body-parser'); // global, shared
const cacheControl = require('../../../middleware/cache-control'); // global, shared
const maintenance = require('../../../middleware/maintenance'); // global, shared
const errorHandler = require('../../../middleware/error-handler'); // global, shared

module.exports = function setupApiApp() {
    debug('Admin API v2 setup start');
    const apiApp = express();

    // API middleware

    // Body parsing
    apiApp.use(bodyParser.json({limit: '1mb'}));
    apiApp.use(bodyParser.urlencoded({extended: true, limit: '1mb'}));

    // Query parsing
    apiApp.use(boolParser());

    // send 503 json response in case of maintenance
    apiApp.use(maintenance);

    // Check version matches for API requests, depends on res.locals.safeVersion being set
    // Therefore must come after themeHandler.ghostLocals, for now
    apiApp.use(versionMatch);

    // API shouldn't be cached
    apiApp.use(cacheControl('private'));

    // Routing
    apiApp.use(routes());

    // API error handling
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(errorHandler.handleJSONResponse);

    debug('Admin API v2 setup end');

    return apiApp;
};
