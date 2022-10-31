const debug = require('@tryghost/debug')('web:api:endpoints:content:app');
const boolParser = require('express-query-boolean');
const bodyParser = require('body-parser');
const express = require('../../../../../shared/express');
const sentry = require('../../../../../shared/sentry');
const config = require('../../../../../shared/config');
const shared = require('../../../shared');
const routes = require('./routes');
const errorHandler = require('@tryghost/mw-error-handler');
const apiVersionCompatibility = require('../../../../services/api-version-compatibility');

module.exports = function setupApiApp() {
    debug('Content API setup start');
    const apiApp = express('content api');

    // API middleware

    // @NOTE: req.body is undefined if we don't use this parser, this can trouble if components rely on req.body being present
    apiApp.use(bodyParser.json({limit: '50mb'}));

    // Query parsing
    apiApp.use(boolParser());

    // Content API should allow public caching
    apiApp.use(shared.middleware.cacheControl('public', {
        maxAge: config.get('caching:contentAPI:maxAge')
    }));

    // Routing
    apiApp.use(routes());

    // API error handling
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(apiVersionCompatibility.errorHandler);
    apiApp.use(errorHandler.handleJSONResponse(sentry));

    debug('Content API setup end');

    return apiApp;
};
