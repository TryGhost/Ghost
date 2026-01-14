const debug = require('@tryghost/debug')('web:api:default:app');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const sentry = require('../../../shared/sentry');
const middleware = require('../shared/middleware');
const errorHandler = require('@tryghost/mw-error-handler');
const APIVersionCompatibilityService = require('../../services/api-version-compatibility');

/**
 * @returns {import('express').Application}
 */
module.exports = function setupApiApp() {
    debug('Parent API setup start');
    const apiApp = express('api');

    if (config.get('server:testmode')) {
        apiApp.use(require('./testmode')());
    }

    apiApp.use(APIVersionCompatibilityService.versionRewrites);
    apiApp.use(APIVersionCompatibilityService.contentVersion);

    // Enforce capped limit parameter
    apiApp.use(middleware.maxLimitCap);

    apiApp.lazyUse('/content/', require('./endpoints/content/app'));
    apiApp.lazyUse('/admin/', require('./endpoints/admin/app'));

    // Error handling for requests to non-existent API versions
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(errorHandler.handleJSONResponse(sentry));

    debug('Parent API setup end');
    return apiApp;
};
