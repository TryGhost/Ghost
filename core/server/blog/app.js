var debug = require('debug')('ghost:blog'),
    path = require('path'),

    // App requires
    config = require('../config'),
    storage = require('../storage'),
    utils = require('../utils'),

    // This should probably be an internal app
    sitemapHandler = require('../data/xml/sitemap/handler'),

    // routes
    routes = require('./routes'),

    // local middleware
    cacheControl = require('../middleware/cache-control'),
    checkSSL = require('../middleware/check-ssl'),
    errorHandler = require('../middleware/error-handler'),
    maintenance = require('../middleware/maintenance'),
    prettyURLs = require('../middleware/pretty-urls'),
    serveSharedFile = require('../middleware/serve-shared-file'),
    staticTheme = require('../middleware/static-theme'),
    themeHandler = require('../middleware/theme-handler'),
    serveFavicon = require('../middleware/serve-favicon');

module.exports = function setupBlogApp() {
    debug('Blog setup start');

    var blogApp = require('express')();

    // ## App - specific code
    // set the view engine
    blogApp.set('view engine', 'hbs');

    // Theme middleware
    // rightly or wrongly currently comes before theme static assets
    // @TODO revisit where and when these are needed
    blogApp.use(themeHandler.updateActiveTheme);
    blogApp.use(themeHandler.configHbsForContext);
    debug('Themes done');

    // Static content/assets
    // @TODO make sure all of these have a local 404 error handler
    // Favicon
    blogApp.use(serveFavicon());
    // Ghost-Url
    blogApp.use(serveSharedFile('shared/ghost-url.js', 'application/javascript', utils.ONE_HOUR_S));
    blogApp.use(serveSharedFile('shared/ghost-url.min.js', 'application/javascript', utils.ONE_HOUR_S));
    // Serve sitemap.xsl file
    blogApp.use(serveSharedFile('sitemap.xsl', 'text/xsl', utils.ONE_DAY_S));
    // Serve robots.txt if not found in theme
    blogApp.use(serveSharedFile('robots.txt', 'text/plain', utils.ONE_HOUR_S));
    // Serve blog images using the storage adapter
    blogApp.use('/content/images', storage.getStorage().serve());

    // Theme static assets/files
    blogApp.use(staticTheme());
    debug('Static content done');

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal & external apps
    config.get('internalApps').forEach(function (appName) {
        var app = require(path.join(config.get('paths').internalAppPath, appName));
        if (app.hasOwnProperty('setupMiddleware')) {
            app.setupMiddleware(blogApp);
        }
    });

    // site map - this should probably be refactored to be an internal app
    sitemapHandler(blogApp);
    debug('Internal apps done');

    // send 503 error page in case of maintenance
    blogApp.use(maintenance);

    // Force SSL if required
    // must happen AFTER asset loading and BEFORE routing
    blogApp.use(checkSSL);

    // Add in all trailing slashes & remove uppercase
    // must happen AFTER asset loading and BEFORE routing
    blogApp.use(prettyURLs);

    // ### Caching
    // Blog frontend is cacheable
    blogApp.use(cacheControl('public'));

    debug('General middleware done');

    // Set up Frontend routes (including private blogging routes)
    blogApp.use(routes());

    // ### Error handlers
    blogApp.use(errorHandler.pageNotFound);
    blogApp.use(errorHandler.handleHTMLResponse);

    debug('Blog setup end');

    return blogApp;
};
