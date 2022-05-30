const debug = require('@tryghost/debug')('web:api:canary:content:app');
const boolParser = require('express-query-boolean');
const bodyParser = require('body-parser');
const express = require('../../../../../shared/express');
const sentry = require('../../../../../shared/sentry');
const shared = require('../../../shared');
const routes = require('./routes');
const errorHandler = require('@tryghost/mw-error-handler');
const apiVersionCompatibility = require('../../../../services/api-version-compatibility');

module.exports = function setupApiApp() {
    debug('Content API canary setup start');
    const apiApp = express('canary content');

    // API middleware

    // @NOTE: req.body is undefined if we don't use this parser, this can trouble if components rely on req.body being present
    apiApp.use(bodyParser.json({limit: '50mb'}));

    // Query parsing
    apiApp.use(boolParser());

    // API shouldn't be cached
    apiApp.use(shared.middleware.cacheControl('private'));

    // Routing
    apiApp.use(routes());

    // API error handling
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(apiVersionCompatibility.errorHandler);
    apiApp.use(errorHandler.handleJSONResponse(sentry));

    debug('Content API canary setup end');

    return apiApp;
};
