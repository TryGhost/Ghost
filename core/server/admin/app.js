var debug = require('debug')('ghost:admin'),
    config = require('../config'),
    express = require('express'),
    adminHbs = require('express-hbs').create(),

    // Admin only middleware
    redirectToSetup = require('../middleware/redirect-to-setup'),

    // Global/shared middleware?
    cacheControl = require('../middleware/cache-control'),
    urlRedirects = require('../middleware/url-redirects'),
    errorHandler = require('../middleware//error-handler'),
    maintenance = require('../middleware/maintenance'),
    prettyURLs = require('../middleware//pretty-urls'),
    serveStatic = require('express').static,
    utils = require('../utils');

module.exports = function setupAdminApp() {
    debug('Admin setup start');
    var adminApp = express();

    // First determine whether we're serving admin or theme content
    // @TODO finish refactoring this away.
    adminApp.use(function setIsAdmin(req, res, next) {
        res.isAdmin = true;
        next();
    });

    // @TODO replace all this with serving ember's index.html
    // Create a hbs instance for admin and init view engine
    adminApp.set('view engine', 'hbs');
    adminApp.set('views', config.get('paths').adminViews);
    adminApp.engine('hbs', adminHbs.express3({}));
    // Register our `asset` helper
    adminHbs.registerHelper('asset', require('../helpers/asset'));

    // Admin assets
    // @TODO ensure this gets a local 404 error handler
    adminApp.use('/assets', serveStatic(
        config.get('paths').clientAssets,
        {maxAge: utils.ONE_YEAR_MS, fallthrough: false}
    ));

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
    adminApp.use(redirectToSetup);

    // Finally, routing
    adminApp.get('*', require('./controller'));

    adminApp.use(errorHandler.pageNotFound);
    adminApp.use(errorHandler.handleHTMLResponse);

    debug('Admin setup end');

    return adminApp;
};
