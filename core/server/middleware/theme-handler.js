var _      = require('lodash'),
    fs     = require('fs'),
    path   = require('path'),
    hbs    = require('express-hbs'),
    config = require('../config'),
    utils = require('../utils'),
    logging = require('../logging'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    settingsCache = require('../settings/cache'),
    themeList = require('../themes').list,
    themeHandler;

themeHandler = {
    // ### configHbsForContext Middleware
    // Setup handlebars for the current context (admin or theme)
    configHbsForContext: function configHbsForContext(req, res, next) {
        var themeData = {
                title: settingsCache.get('title'),
                description: settingsCache.get('description'),
                url: utils.url.urlFor('home', {secure: req.secure}, true),
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
            labsData = _.cloneDeep(settingsCache.get('labs')),
            blogApp = req.app;

        hbs.updateTemplateOptions({
            data: {
                blog: themeData,
                labs: labsData
            }
        });

        if (config.getContentPath('themes') && blogApp.get('activeTheme')) {
            blogApp.set('views', path.join(config.getContentPath('themes'), blogApp.get('activeTheme')));
        }

        // Pass 'secure' flag to the view engine
        // so that templates can choose to render https or http 'url', see url utility
        res.locals.secure = req.secure;

        next();
    },

    // ### Activate Theme
    // Helper for updateActiveTheme
    activateTheme: function activateTheme(blogApp, activeTheme) {
        var hbsOptions,
            themePartials = path.join(config.getContentPath('themes'), activeTheme, 'partials');

        // clear the view cache
        blogApp.cache = {};
        // reset the asset hash
        config.assetHash = null;

        // set view engine
        hbsOptions = {
            partialsDir: [config.get('paths').helperTemplates],
            onCompile: function onCompile(exhbs, source) {
                return exhbs.handlebars.compile(source, {preventIndent: true});
            }
        };

        fs.stat(themePartials, function stat(err, stats) {
            // Check that the theme has a partials directory before trying to use it
            if (!err && stats && stats.isDirectory()) {
                hbsOptions.partialsDir.push(themePartials);
            }
        });

        blogApp.engine('hbs', hbs.express3(hbsOptions));

        // Set active theme variable on the express server
        blogApp.set('activeTheme', activeTheme);
    },

    // ### updateActiveTheme
    // Updates the blogApp's activeTheme variable and subsequently
    // activates that theme's views with the hbs templating engine if it
    // is not yet activated.
    updateActiveTheme: function updateActiveTheme(req, res, next) {
        var blogApp = req.app,
            activeTheme = settingsCache.get('activeTheme');

        // Check if the theme changed
        if (activeTheme !== blogApp.get('activeTheme')) {
            // Change theme
            if (!themeList.get(activeTheme)) {
                if (!res.isAdmin) {
                    // Trying to start up without the active theme present, setup a simple hbs instance
                    // and render an error page straight away.
                    blogApp.engine('hbs', hbs.express3());
                    return next(new errors.NotFoundError({
                        message: i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeTheme})
                    }));
                } else {
                    // At this point the activated theme is not present and the current
                    // request is for the admin client.  In order to allow the user access
                    // to the admin client we set an hbs instance on the app so that middleware
                    // processing can continue.
                    blogApp.engine('hbs', hbs.express3());
                    logging.warn(i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeTheme}));
                    return next();
                }
            } else {
                themeHandler.activateTheme(blogApp, activeTheme);
            }
        }

        next();
    }
};

module.exports = themeHandler;
