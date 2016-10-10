var _      = require('lodash'),
    fs     = require('fs'),
    path   = require('path'),
    hbs    = require('express-hbs'),
    api    = require('../api'),
    config = require('../config'),
    logging = require('../logging'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    themeHandler;

themeHandler = {
    // ### configHbsForContext Middleware
    // Setup handlebars for the current context (admin or theme)
    configHbsForContext: function configHbsForContext(req, res, next) {
        var themeData = _.cloneDeep(config.get('theme')),
            labsData = _.cloneDeep(config.get('labs')),
            blogApp = req.app;

        if (req.secure && config.get('urlSSL')) {
            // For secure requests override .url property with the SSL version
            themeData.url = config.get('urlSSL').replace(/\/$/, '');
        }

        // Change camelCase to snake_case
        themeData.posts_per_page = themeData.postsPerPage;
        delete themeData.postsPerPage;

        hbs.updateTemplateOptions({data: {blog: themeData, labs: labsData}});

        if (config.getContentPath('themes') && blogApp.get('activeTheme')) {
            blogApp.set('views', path.join(config.getContentPath('themes'), blogApp.get('activeTheme')));
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
        var blogApp = req.app;

        api.settings.read({context: {internal: true}, key: 'activeTheme'}).then(function then(response) {
            var activeTheme = response.settings[0];

            // Check if the theme changed
            if (activeTheme.value !== blogApp.get('activeTheme')) {
                // Change theme
                if (!config.get('paths').availableThemes.hasOwnProperty(activeTheme.value)) {
                    if (!res.isAdmin) {
                        return next(new errors.NotFoundError({
                            message: i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeTheme.value})
                        }));
                    } else {
                        // At this point the activated theme is not present and the current
                        // request is for the admin client.  In order to allow the user access
                        // to the admin client we set an hbs instance on the app so that middleware
                        // processing can continue.
                        blogApp.engine('hbs', hbs.express3());
                        logging.warn(i18n.t('errors.middleware.themehandler.missingTheme', {theme: activeTheme.value}));
                        return next();
                    }
                } else {
                    themeHandler.activateTheme(blogApp, activeTheme.value);
                }
            }
            next();
        }).catch(function handleError(err) {
            // Trying to start up without the active theme present, setup a simple hbs instance
            // and render an error page straight away.
            blogApp.engine('hbs', hbs.express3());
            next(err);
        });
    }
};

module.exports = themeHandler;
