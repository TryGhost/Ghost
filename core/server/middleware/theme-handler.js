var _      = require('lodash'),
    fs     = require('fs'),
    path   = require('path'),
    hbs    = require('express-hbs'),
    config = require('../config'),
    utils = require('../utils'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    settingsCache = require('../settings/cache'),
    themeList = require('../themes').list,
    themeHandler;

themeHandler = {
    // ### configHbsForContext Middleware
    // Setup handlebars for the current context (admin or theme)
    configHbsForContext: function configHbsForContext(req, res, next) {
        // Static information, same for every request unless the settings change
        // @TODO: bind this once and then update based on events?
        var themeData = {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                facebook: settingsCache.get('facebook'),
                twitter: settingsCache.get('twitter'),
                timezone: settingsCache.get('activeTimezone'),
                navigation: settingsCache.get('navigation'),
                posts_per_page: settingsCache.get('postsPerPage'),
                icon: settingsCache.get('icon'),
                cover: settingsCache.get('cover'),
                logo: settingsCache.get('logo'),
                amp: settingsCache.get('amp')
            },
            labsData = _.cloneDeep(settingsCache.get('labs'));

        // Request-specific information
        // These things are super dependent on the request, so they need to be in middleware
        themeData.url = utils.url.urlFor('home', {secure: req.secure}, true);

        // Pass 'secure' flag to the view engine
        // so that templates can choose to render https or http 'url', see url utility
        res.locals.secure = req.secure;

        // @TODO: only do this if something changed?
        hbs.updateTemplateOptions({
            data: {
                blog: themeData,
                labs: labsData
            }
        });

        next();
    },

    // ### Activate Theme
    // Helper for updateActiveTheme
    activateTheme: function activateTheme(blogApp, activeThemeName) {
        var themePartialsPath = path.join(config.getContentPath('themes'), activeThemeName, 'partials'),
            hbsOptions = {
                partialsDir: [config.get('paths').helperTemplates],
                onCompile: function onCompile(exhbs, source) {
                    return exhbs.handlebars.compile(source, {preventIndent: true});
                }
            };

        fs.stat(themePartialsPath, function stat(err, stats) {
            // Check that the theme has a partials directory before trying to use it
            if (!err && stats && stats.isDirectory()) {
                hbsOptions.partialsDir.push(themePartialsPath);
            }
        });

        // reset the asset hash
        config.assetHash = null;
        // clear the view cache
        blogApp.cache = {};
        // Set the views and engine
        blogApp.set('views', path.join(config.getContentPath('themes'), activeThemeName));
        blogApp.engine('hbs', hbs.express3(hbsOptions));

        // Set active theme variable on the express server
        // Note: this is effectively the "mounted" theme, which has been loaded into the express app
        blogApp.set('activeTheme', activeThemeName);
    },

    // ### updateActiveTheme
    // Updates the blogApp's activeTheme variable and subsequently
    // activates that theme's views with the hbs templating engine if it
    // is not yet activated.
    updateActiveTheme: function updateActiveTheme(req, res, next) {
        var blogApp = req.app,
            activeThemeName = settingsCache.get('activeTheme'),
            mountedThemeName = blogApp.get('activeTheme');

        // This means that the theme hasn't been loaded yet i.e. there is no active theme
        if (!themeList.get(activeThemeName)) {
            // This is the one place we ACTUALLY throw an error for a missing theme
            // As it's a request we cannot serve
            return next(new errors.InternalServerError({
                message: i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeThemeName})
            }));

            // If there is an active theme AND it has changed, call activate
        } else if (activeThemeName !== mountedThemeName) {
            // This is effectively "mounting" a theme into express, the theme is already "active"
            themeHandler.activateTheme(blogApp, activeThemeName);
        }

        next();
    }
};

module.exports = themeHandler;
