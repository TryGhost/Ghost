const debug = require('@tryghost/debug')('web:api:v3:content:app');
const boolParser = require('express-query-boolean');
const bodyParser = require('body-parser');
const express = require('../../../../../shared/express');
const shared = require('../../../shared');
const routes = require('./routes');

module.exports = function setupApiApp() {
    debug('Content API v3 setup start');
    const apiApp = express('v3 content');

    // API middleware

    // @NOTE: req.body is undefined if we don't use this parser, this can trouble if components rely on req.body being present
    apiApp.use(bodyParser.json({limit: '1mb'}));

    // Query parsing
    apiApp.use(boolParser());

    // send 503 json response in case of maintenance
    apiApp.use(shared.middleware.maintenance);

    // API shouldn't be cached
    apiApp.use(shared.middleware.cacheControl('private'));

    // Routing
    apiApp.use(routes());

    // API error handling
    apiApp.use(shared.middleware.errorHandler.resourceNotFound);
    apiApp.use(shared.middleware.errorHandler.handleJSONResponse);

    debug('Content API v3 setup end');

    return apiApp;
};
