var _ = require('lodash'),
    hbs = require('./engine'),
    urlService = require('../url'),
    config = require('../../config'),
    common = require('../../lib/common'),
    settingsCache = require('../settings/cache'),
    activeTheme = require('./active'),
    themeMiddleware = {};

// ### Ensure Active Theme
// Ensure there's a properly set & mounted active theme before attempting to serve a blog request
// If there is no active theme, throw an error
// Else, ensure the active theme is mounted
themeMiddleware.ensureActiveTheme = function ensureActiveTheme(req, res, next) {
    // CASE: this means that the theme hasn't been loaded yet i.e. there is no active theme
    if (!activeTheme.get()) {
        // This is the one place we ACTUALLY throw an error for a missing theme as it's a request we cannot serve
        return next(new common.errors.InternalServerError({
            // We use the settingsCache here, because the setting will be set,
            // even if the theme itself is not usable because it is invalid or missing.
            message: common.i18n.t('errors.middleware.themehandler.missingTheme', {theme: settingsCache.get('active_theme')})
        }));
    }

    // CASE: bootstrap theme validation failed, we would like to show the errors on the blog [only production]
    if (activeTheme.get().error && config.get('env') === 'production') {
        return next(new common.errors.InternalServerError({
            // We use the settingsCache here, because the setting will be set,
            // even if the theme itself is not usable because it is invalid or missing.
            message: common.i18n.t('errors.middleware.themehandler.invalidTheme', {theme: settingsCache.get('active_theme')}),
            errorDetails: activeTheme.get().error.errorDetails
        }));
    }

    // If the active theme has not yet been mounted, mount it into express
    if (!activeTheme.get().mounted) {
        activeTheme.get().mount(req.app);
    }

    next();
};

// ### Update Template Data
// Updates handlebars with the contextual data for the current request
themeMiddleware.updateTemplateData = function updateTemplateData(req, res, next) {
    // Static information, same for every request unless the settings change
    // @TODO: bind this once and then update based on events?
    // @TODO: decouple theme layer from settings cache using the Content API
    var siteData = settingsCache.getPublic(),
        labsData = _.cloneDeep(settingsCache.get('labs')),
        themeData = {};

    if (activeTheme.get()) {
        themeData.posts_per_page = activeTheme.get().config('posts_per_page');
        themeData.image_sizes = activeTheme.get().config('image_sizes');
    }

    // Request-specific information
    // These things are super dependent on the request, so they need to be in middleware
    // Serve the blog url without trailing slash
    siteData.url = urlService.utils.urlFor('home', {secure: req.secure, trailingSlash: false}, true);

    // Pass 'secure' flag to the view engine
    // so that templates can choose to render https or http 'url', see url utility
    res.locals.secure = req.secure;

    // @TODO: only do this if something changed?
    // @TODO: remove blog if we drop v0.1 (Ghost 3.0)
    hbs.updateTemplateOptions({
        data: {
            blog: siteData,
            site: siteData,
            labs: labsData,
            config: themeData,
            member: req.member
        }
    });

    next();
};

module.exports = [
    themeMiddleware.ensureActiveTheme,
    themeMiddleware.updateTemplateData
];
