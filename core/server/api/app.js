// # API routes
var debug = require('ghost-ignition').debug('api'),
    express = require('express'),

    // routes
    routes = require('./routes'),

    // Include the middleware

    // API specific
    versionMatch = require('../middleware/api/version-match'), // global

    // Shared
    bodyParser = require('body-parser'), // global, shared
    cacheControl = require('../middleware/cache-control'), // global, shared
    maintenance = require('../middleware/maintenance'), // global, shared
    errorHandler = require('../middleware/error-handler'); // global, shared

module.exports = function setupApiApp() {
    debug('API setup start');
    var apiApp = express();

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

    debug('API setup end');

    return apiApp;
};
