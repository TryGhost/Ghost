var debug = require('debug')('ghost:admin'),
    config = require('../config'),
    express = require('express'),
    adminHbs = require('express-hbs').create(),

    // Admin only middleware
    redirectToSetup = require('./middleware/redirect-to-setup'),

    // Global/shared middleware?
    cacheControl = require('../middleware/cache-control'),
    checkSSL = require('../middleware/check-ssl'),
    maintenance = require('../middleware/maintenance'),
    serveStatic = require('express').static,
    utils = require('../utils');

module.exports = function setupAdminApp() {
    debug('Admin setup start');
    var adminApp = express();

    // this is the admin app
    adminApp.set('isAdmin', true);

    // Create a hbs instance for admin and init view engine
    adminApp.set('view engine', 'hbs');
    adminApp.set('views', config.get('paths').adminViews);
    adminApp.engine('hbs', adminHbs.express3({}));

    // Register our `asset` helper
    adminHbs.registerHelper('asset', require('../helpers/asset'));

    // SSL handling
    adminApp.use(checkSSL);

    // Render error page in case of maintenance
    adminApp.use(maintenance);

    // Cache headers go last before serving the request
    // Admin is currently set to not be cached at all
    adminApp.use(cacheControl('private'));
    // Special redirects for the admin (these should have their own cache-control headers)
    adminApp.use(redirectToSetup);

    // Finally, routing
    adminApp.get('*', require('./controller'));

    debug('Admin setup end');

    return adminApp;
};

module.exports.assets = function (parentApp) {
    parentApp.use('/ghost/assets', serveStatic(
        config.get('paths').clientAssets,
        {maxAge: utils.ONE_YEAR_MS, fallthrough: false}
    ));
};
