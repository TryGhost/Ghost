// # API routes
const debug = require('ghost-ignition').debug('web:api:v0.1:app');
const boolParser = require('express-query-boolean');
const express = require('express');

// routes
const routes = require('./routes');

// Include the middleware

// API specific
const versionMatch = require('../../shared/middlewares/api/version-match'); // global

// Shared
const bodyParser = require('body-parser'); // global, shared
const cacheControl = require('../../shared/middlewares/cache-control'); // global, shared
const maintenance = require('../../shared/middlewares/maintenance'); // global, shared
const errorHandler = require('../../shared/middlewares/error-handler'); // global, shared

module.exports = function setupApiApp() {
    debug('API v0.1 setup start');
    const apiApp = express();

    // @TODO finish refactoring this away.
    apiApp.use(function setIsAdmin(req, res, next) {
        // api === isAdmin
        res.isAdmin = true;
        next();
    });

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

    debug('API v0.1 setup end');

    return apiApp;
};
