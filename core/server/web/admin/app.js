const debug = require('ghost-ignition').debug('admin');
const express = require('express');

// App requires
const config = require('../../config');
const constants = require('../../lib/constants');
const urlService = require('../../services/url');

// Middleware
// Admin only middleware
const adminMiddleware = require('./middleware');
const serveStatic = require('express').static;

// Global/shared middleware
const cacheControl = require('../middleware/cache-control');
const urlRedirects = require('../middleware/url-redirects');
const errorHandler = require('../middleware/error-handler');
const maintenance = require('../middleware/maintenance');
const prettyURLs = require('../middleware/pretty-urls');

module.exports = function setupAdminApp() {
    debug('Admin setup start');
    const adminApp = express();

    // First determine whether we're serving admin or theme content
    // @TODO finish refactoring this away.
    adminApp.use((req, res, next) => {
        res.isAdmin = true;
        next();
    });

    // Admin assets
    // @TODO ensure this gets a local 404 error handler
    const configMaxAge = config.get('caching:admin:maxAge');
    adminApp.use('/assets', serveStatic(
        config.get('paths').clientAssets,
        {maxAge: (configMaxAge || configMaxAge === 0) ? configMaxAge : constants.ONE_YEAR_MS, fallthrough: false}
    ));

    // Service Worker for offline support
    adminApp.get(/^\/(sw.js|sw-registration.js)$/, require('./serviceworker'));

    // Ember CLI's live-reload script
    if (config.get('env') === 'development') {
        adminApp.get('/ember-cli-live-reload.js', (req, res) => {
            res.redirect(`http://localhost:4200${urlService.utils.getSubdir()}/ghost/ember-cli-live-reload.js`);
        });
    }

    // Render error page in case of maintenance
    adminApp.use(maintenance);

    // Force SSL if required
    // must happen AFTER asset loading and BEFORE routing
    adminApp.use(urlRedirects);

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    adminApp.use(prettyURLs);

    // Cache headers go last before serving the request
    // Admin is currently set to not be cached at all
    adminApp.use(cacheControl('private'));
    // Special redirects for the admin (these should have their own cache-control headers)
    adminApp.use(adminMiddleware);

    // Finally, routing
    adminApp.get('*', require('./controller'));

    adminApp.use(errorHandler.pageNotFound);
    adminApp.use(errorHandler.handleHTMLResponse);

    debug('Admin setup end');

    return adminApp;
};
