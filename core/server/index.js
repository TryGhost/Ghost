// # Bootup
// This file needs serious love & refactoring

// Module dependencies
var express     = require('express'),
    hbs         = require('express-hbs'),
    compress    = require('compression'),
    uuid        = require('node-uuid'),
    Promise     = require('bluebird'),
    i18n        = require('./i18n'),
    api         = require('./api'),
    config      = require('./config'),
    errors      = require('./errors'),
    helpers     = require('./helpers'),
    middleware  = require('./middleware'),
    migrations  = require('./data/migration'),
    models      = require('./models'),
    permissions = require('./permissions'),
    apps        = require('./apps'),
    sitemap     = require('./data/xml/sitemap'),
    xmlrpc      = require('./data/xml/xmlrpc'),
    GhostServer = require('./ghost-server'),
    validateThemes = require('./utils/validate-themes'),

    dbHash;

function initDbHashAndFirstRun() {
    return api.settings.read({key: 'dbHash', context: {internal: true}}).then(function (response) {
        var hash = response.settings[0].value,
            initHash;

        dbHash = hash;

        if (dbHash === null) {
            initHash = uuid.v4();
            return api.settings.edit({settings: [{key: 'dbHash', value: initHash}]}, {context: {internal: true}})
                .then(function (response) {
                    dbHash = response.settings[0].value;
                    return dbHash;
                    // Use `then` here to do 'first run' actions
                });
        }

        return dbHash;
    });
}

// ## Initialise Ghost
// Sets up the express server instances, runs init on a bunch of stuff, configures views, helpers, routes and more
// Finally it returns an instance of GhostServer
function init(options) {
    // Get reference to an express app instance.
    var blogApp = express(),
        adminApp = express();

    // ### Initialisation
    // The server and its dependencies require a populated config
    // It returns a promise that is resolved when the application
    // has finished starting up.

    // Initialize Internationalization
    i18n.init();

    // Load our config.js file from the local file system.
    return config.load(options.config).then(function () {
        return config.checkDeprecated();
    }).then(function () {
        // Initialise the models
        return models.init();
    }).then(function () {
        // Initialize migrations
        return migrations.init();
    }).then(function () {
        // Populate any missing default settings
        return models.Settings.populateDefaults();
    }).then(function () {
        // Initialize the settings cache
        return api.init();
    }).then(function () {
        // Initialize the permissions actions and objects
        // NOTE: Must be done before initDbHashAndFirstRun calls
        return permissions.init();
    }).then(function () {
        return Promise.join(
            // Check for or initialise a dbHash.
            initDbHashAndFirstRun(),
            // Initialize apps
            apps.init(),
            // Initialize sitemaps
            sitemap.init(),
            // Initialize xmrpc ping
            xmlrpc.init()
        );
    }).then(function () {
        var adminHbs = hbs.create();

        // ##Configuration

        // return the correct mime type for woff files
        express.static.mime.define({'application/font-woff': ['woff']});

        // enabled gzip compression by default
        if (config.server.compress !== false) {
            blogApp.use(compress());
        }

        // ## View engine
        // set the view engine
        blogApp.set('view engine', 'hbs');

        // Create a hbs instance for admin and init view engine
        adminApp.set('view engine', 'hbs');
        adminApp.engine('hbs', adminHbs.express3({}));

        // Load helpers
        helpers.loadCoreHelpers(adminHbs);

        // ## Middleware and Routing
        middleware(blogApp, adminApp);

        // Log all theme errors and warnings
        validateThemes(config.paths.themePath)
            .catch(function (result) {
                // TODO: change `result` to something better
                result.errors.forEach(function (err) {
                    errors.logError(err.message, err.context, err.help);
                });

                result.warnings.forEach(function (warn) {
                    errors.logWarn(warn.message, warn.context, warn.help);
                });
            });

        return new GhostServer(blogApp);
    });
}

module.exports = init;
