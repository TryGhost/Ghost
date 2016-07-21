var _      = require('lodash'),
    fs     = require('fs'),
    path   = require('path'),
    hbs    = require('express-hbs'),
    api    = require('../api'),
    config = require('../config'),
    errors = require('../errors'),
    i18n   = require('../i18n'),
    themeHandler;

themeHandler = {
    // ### GhostLocals Middleware
    // Expose the standard locals that every external page should have available,
    // separating between the theme and the admin
    ghostLocals: function ghostLocals(req, res, next) {
        // Make sure we have a locals value.
        res.locals = res.locals || {};
        res.locals.version = config.ghostVersion;
        res.locals.safeVersion = config.ghostVersion.match(/^(\d+\.)?(\d+)/)[0];
        // relative path from the URL
        res.locals.relativeUrl = req.path;

        next();
    },

    // ### configHbsForContext Middleware
    // Setup handlebars for the current context (admin or theme)
    configHbsForContext: function configHbsForContext(req, res, next) {
        var themeData = _.cloneDeep(config.theme),
            labsData = _.cloneDeep(config.labs),
            blogApp = req.app;

        if (req.secure && config.urlSSL) {
            // For secure requests override .url property with the SSL version
            themeData.url = config.urlSSL.replace(/\/$/, '');
        }

        // Change camelCase to snake_case
        themeData.posts_per_page = themeData.postsPerPage;
        delete themeData.postsPerPage;

        hbs.updateTemplateOptions({data: {blog: themeData, labs: labsData}});

        if (config.paths.themePath && blogApp.get('activeTheme')) {
            blogApp.set('views', path.join(config.paths.themePath, blogApp.get('activeTheme')));
        }

        // Pass 'secure' flag to the view engine
        // so that templates can choose 'url' vs 'urlSSL'
        res.locals.secure = req.secure;
        next();
    },

    // ### Activate Theme
    // Helper for updateActiveTheme
    activateTheme: function activateTheme(blogApp, activeTheme) {
        var hbsOptions,
            themePartials = path.join(config.paths.themePath, activeTheme, 'partials');

        // clear the view cache
        blogApp.cache = {};

        // set view engine
        hbsOptions = {
            partialsDir: [config.paths.helperTemplates],
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

        // Update user error template
        errors.updateActiveTheme(activeTheme);

        // Set active theme variable on the express server
        blogApp.set('activeTheme', activeTheme);
    },

    // ### updateActiveTheme
    // Updates the blogApp's activeTheme variable and subsequently
    // activates that theme's views with the hbs templating engine if it
    // is not yet activated.
    //
    // on server bootstrap we activate the default theme (which is casper)
    updateActiveTheme: function updateActiveTheme(blog) {
        themeHandler.activateTheme(blog, config.theme.activeTheme);

        return function updateActiveThemeDynamically(req, res, next) {
            var blogApp = req.app;

            api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function then(response) {
                var activeTheme = response.settings[0];

                // Check if the theme changed
                if (activeTheme.value !== blogApp.get('activeTheme')) {
                    // Change theme
                    if (!config.paths.availableThemes.hasOwnProperty(activeTheme.value)) {
                        if (!res.isAdmin) {
                            // Throw an error if the theme is not available, but not on the admin UI
                            return errors.throwError(i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeTheme.value}));
                        } else {
                            errors.logWarn(i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeTheme.value}));
                            return next();
                        }
                    } else {
                        themeHandler.activateTheme(blogApp, activeTheme.value);
                    }
                }
                next();
            }).catch(function handleError(err) {
                next(err);
            });
        };
    }
};

module.exports = themeHandler;
