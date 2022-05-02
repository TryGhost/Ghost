const debug = require('@tryghost/debug')('web:api:default:app');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
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
    // Rewrite the URL and add the accept-version & deprecated headers
    apiApp.all('/:version(v2|v3|v4|canary)/:api(admin|content)/*', (req, res, next) => {
        let {version} = req.params;
        const versionlessUrl = req.url.replace(`${version}/`, '');

        // Always send the explicit, numeric version in headers
        if (version === 'canary') {
            version = 'v4';
        }

        // Rewrite the url
        req.url = versionlessUrl;

        // Add the accept-version header so our internal systems will act as if it was set on the request
        req.headers['accept-version'] = req.headers['accept-version'] || `${version}.0`;

        res.header('Deprecation', `version="${version}"`);
        // @TODO: fix this missing case in urlFor
        res.header('Link', `<${urlUtils.urlFor('admin', true)}api${versionlessUrl}>; rel="latest-version"`);

        next();
    });

    apiApp.use(APIVersionCompatibilityService.contentVersion);

    apiApp.lazyUse('/content/', require('./canary/content/app'));
    apiApp.lazyUse('/admin/', require('./canary/admin/app'));

    // Error handling for requests to non-existent API versions
    apiApp.use(errorHandler.resourceNotFound);
    apiApp.use(APIVersionCompatibilityService.errorHandler);
    apiApp.use(errorHandler.handleJSONResponseV2(sentry));

    debug('Parent API setup end');
    return apiApp;
};
