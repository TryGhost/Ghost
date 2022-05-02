const debug = require('@tryghost/debug')('web:api:default:app');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const sentry = require('../../../shared/sentry');
const errorHandler = require('@tryghost/mw-error-handler');
const APIVersionCompatibilityService = require('../../services/api-version-compatibility');

module.exports = function setupApiApp() {
    debug('Parent API setup start');
    const apiApp = express('api');

    if (config.get('server:testmode')) {
        apiApp.use(require('./testmode')());
    }

    // If there is a version in the URL, and this is a valid API URL containing admin/content
    // Then 307 redirect (preserves the HTTP method) to a versionless URL with `accept-version` set.
    apiApp.all('/:version(v2|v3|v4|canary)/:api(admin|content)/*', (req, res) => {
        const {version} = req.params;
        const versionlessURL = req.originalUrl.replace(`${version}/`, '');
        if (version.startsWith('v')) {
            res.header('accept-version', `${version}.0`);
        } else {
            res.header('accept-version', version);
        }
        res.redirect(307, versionlessURL);
    });

    apiApp.lazyUse('/content/', require('./canary/content/app'));
    apiApp.lazyUse('/admin/', require('./canary/admin/app'));

    // Error handling for requests to non-existent API versions
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(APIVersionCompatibilityService.errorHandler);
    apiApp.use(errorHandler.handleJSONResponseV2(sentry));

    debug('Parent API setup end');
    return apiApp;
};
