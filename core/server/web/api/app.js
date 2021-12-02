const debug = require('@tryghost/debug')('web:api:default:app');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
const errorHandler = require('../shared/middleware/error-handler');

module.exports = function setupApiApp() {
    debug('Parent API setup start');
    const apiApp = express('api');

    if (config.get('server:testmode')) {
        apiApp.use(require('./testmode')());
    }

    apiApp.lazyUse(urlUtils.getVersionPath({version: 'canary', type: 'content'}), require('./canary/content/app'));
    apiApp.lazyUse(urlUtils.getVersionPath({version: 'canary', type: 'admin'}), require('./canary/admin/app'));

    // Error handling for requests to non-existent API versions
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(errorHandler.handleJSONResponse);

    debug('Parent API setup end');
    return apiApp;
};
