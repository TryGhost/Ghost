const debug = require('ghost-ignition').debug('web:admin:app');
const express = require('../../../shared/express');
const serveStatic = express.static;
const config = require('../../../shared/config');
const constants = require('@tryghost/constants');
const urlUtils = require('../../../shared/url-utils');
const shared = require('../shared');
const adminMiddleware = require('./middleware');

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

    // Render error page in case of maintenance
    adminApp.use(shared.middlewares.maintenance);

    // Force SSL if required
    // must happen AFTER asset loading and BEFORE routing
    adminApp.use(shared.middlewares.urlRedirects.adminSSLAndHostRedirect);

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    adminApp.use(shared.middlewares.prettyUrls);

    // Cache headers go last before serving the request
    // Admin is currently set to not be cached at all
    adminApp.use(shared.middlewares.cacheControl('private'));
    // Special redirects for the admin (these should have their own cache-control headers)
    adminApp.use(adminMiddleware);

    // Finally, routing
    adminApp.get('*', require('./controller'));

    adminApp.use(shared.middlewares.errorHandler.pageNotFound);
    adminApp.use(shared.middlewares.errorHandler.handleHTMLResponse);

    debug('Admin setup end');

    return adminApp;
};
