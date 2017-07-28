var debug = require('debug')('ghost:blog'),
    path = require('path'),

    // App requires
    config = require('../config'),
    storage = require('../adapters/storage'),
    utils = require('../utils'),

    // This should probably be an internal app
    sitemapHandler = require('../data/xml/sitemap/handler'),

    // routes
    routes = require('./routes'),

    // local middleware
    cacheControl = require('../middleware/cache-control'),
    urlRedirects = require('../middleware/url-redirects'),
    errorHandler = require('../middleware/error-handler'),
    maintenance = require('../middleware/maintenance'),
    prettyURLs = require('../middleware/pretty-urls'),
    servePublicFile = require('../middleware/serve-public-file'),
    staticTheme = require('../middleware/static-theme'),
    customRedirects = require('../middleware/custom-redirects'),
    serveFavicon = require('../middleware/serve-favicon'),

    // middleware for themes
    themeMiddleware = require('../themes').middleware;

module.exports = function setupBlogApp() {
    debug('Blog setup start');

    var blogApp = require('express')();

    // ## App - specific code
    // set the view engine
    blogApp.set('view engine', 'hbs');

    // you can extend Ghost with a custom redirects file
    // see https://github.com/TryGhost/Ghost/issues/7707
    customRedirects(blogApp);

    // Static content/assets
    // @TODO make sure all of these have a local 404 error handler
    // Favicon
    blogApp.use(serveFavicon());
    // /public/ghost-sdk.js
    blogApp.use(servePublicFile('public/ghost-sdk.js', 'application/javascript', utils.ONE_HOUR_S));
    blogApp.use(servePublicFile('public/ghost-sdk.min.js', 'application/javascript', utils.ONE_HOUR_S));
    // Serve sitemap.xsl file
    blogApp.use(servePublicFile('sitemap.xsl', 'text/xsl', utils.ONE_DAY_S));

    // Serve stylesheets for default templates
    blogApp.use(servePublicFile('public/ghost.css', 'text/css', utils.ONE_HOUR_S));
    blogApp.use(servePublicFile('public/ghost.min.css', 'text/css', utils.ONE_HOUR_S));

    // Serve images for default templates
    blogApp.use(servePublicFile('public/404-ghost@2x.png', 'png', utils.ONE_HOUR_S));
    blogApp.use(servePublicFile('public/404-ghost.png', 'png', utils.ONE_HOUR_S));

    // Serve blog images using the storage adapter
    blogApp.use('/' + utils.url.STATIC_IMAGE_URL_PREFIX, storage.getStorage().serve());

    // @TODO find this a better home
    // We do this here, at the top level, because helpers require so much stuff.
    // Moving this to being inside themes, where it probably should be requires the proxy to be refactored
    // Else we end up with circular dependencies
    require('../helpers').loadCoreHelpers();
    debug('Helpers done');

    // Theme middleware
    // This should happen AFTER any shared assets are served, as it only changes things to do with templates
    // At this point the active theme object is already updated, so we have the right path, so it can probably
    // go after staticTheme() as well, however I would really like to simplify this and be certain
    blogApp.use(themeMiddleware);
    debug('Themes done');

    // Theme static assets/files
    blogApp.use(staticTheme());
    debug('Static content done');

    // Serve robots.txt if not found in theme
    blogApp.use(servePublicFile('robots.txt', 'text/plain', utils.ONE_HOUR_S));

    // setup middleware for internal apps
    // @TODO: refactor this to be a proper app middleware hook for internal & external apps
    config.get('apps:internal').forEach(function (appName) {
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
    blogApp.use(urlRedirects);

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
