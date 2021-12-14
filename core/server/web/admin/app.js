const debug = require('@tryghost/debug')('web:admin:app');
const express = require('../../../shared/express');
const serveStatic = express.static;
const config = require('../../../shared/config');
const constants = require('@tryghost/constants');
const urlUtils = require('../../../shared/url-utils');
const shared = require('../shared');
const errorHandler = require('@tryghost/mw-error-handler');
const sentry = require('../../../shared/sentry');
const redirectAdminUrls = require('./middleware/redirect-admin-urls');

module.exports = function setupAdminApp() {
    debug('Admin setup start');
    const adminApp = express('admin');

    // Admin assets
    // @TODO ensure this gets a local 404 error handler
    const configMaxAge = config.get('caching:admin:maxAge');
    adminApp.use('/assets', serveStatic(
        config.get('paths').clientAssets,
        {maxAge: (configMaxAge || configMaxAge === 0) ? configMaxAge : constants.ONE_YEAR_MS, fallthrough: false}
    ));

    // Ember CLI's live-reload script
    if (config.get('env') === 'development') {
        adminApp.get('/ember-cli-live-reload.js', function emberLiveReload(req, res) {
            res.redirect(`http://localhost:4200${urlUtils.getSubdir()}/ghost/ember-cli-live-reload.js`);
        });
    }

    // Force SSL if required
    // must happen AFTER asset loading and BEFORE routing
    adminApp.use(shared.middleware.urlRedirects.adminSSLAndHostRedirect);

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    adminApp.use(shared.middleware.prettyUrls);

    // Cache headers go last before serving the request
    // Admin is currently set to not be cached at all
    adminApp.use(shared.middleware.cacheControl('private'));

    // Special redirects for the admin (these should have their own cache-control headers)
    adminApp.use(redirectAdminUrls);

    // Finally, routing
    adminApp.get('*', require('./controller'));

    adminApp.use(errorHandler.pageNotFound);
    adminApp.use(errorHandler.handleHTMLResponse(sentry));

    debug('Admin setup end');

    return adminApp;
};
