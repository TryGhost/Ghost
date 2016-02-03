// # Bootup
// This file needs serious love & refactoring

// Module dependencies
var express     = require('express'),
    hbs         = require('express-hbs'),
    compress    = require('compression'),
    fs          = require('fs'),
    uuid        = require('node-uuid'),
    Promise     = require('bluebird'),
    i18n        = require('./i18n'),

    api         = require('./api'),
    config      = require('./config'),
    errors      = require('./errors'),
    helpers     = require('./helpers'),
    mailer      = require('./mail'),
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

// Checks for the existence of the "built" javascript files from grunt concat.
// Returns a promise that will be resolved if all files exist or rejected if
// any are missing.
function builtFilesExist() {
    var deferreds = [],
        location = config.paths.clientAssets,
        fileNames = ['ghost.js', 'vendor.js', 'ghost.css', 'vendor.css'];

    if (process.env.NODE_ENV === 'production') {
        // Production uses `.min` files
        fileNames = fileNames.map(function (file) {
            return file.replace('.', '.min.');
        });
    }

    function checkExist(fileName) {
        var errorMessage = i18n.t('errors.index.javascriptFilesNotBuilt.error'),
            errorHelp = i18n.t('errors.index.javascriptFilesNotBuilt.help', {link: '\nhttps://github.com/TryGhost/Ghost#getting-started'});

        return new Promise(function (resolve, reject) {
            fs.stat(fileName, function (statErr) {
                var exists = (statErr) ? false : true,
                    err;

                if (exists) {
                    resolve(true);
                } else {
                    err = new Error(errorMessage);

                    err.help = errorHelp;
                    reject(err);
                }
            });
        });
    }

    fileNames.forEach(function (fileName) {
        deferreds.push(checkExist(location + fileName));
    });

    return Promise.all(deferreds);
}

// This is run after every initialization is done, right before starting server.
// Its main purpose is to move adding notifications here, so none of the submodules
// should need to include api, which previously resulted in circular dependencies.
// This is also a "one central repository" of adding startup notifications in case
// in the future apps will want to hook into here
function initNotifications() {
    if (mailer.state && mailer.state.usingDirect) {
        api.notifications.add({notifications: [{
            type: 'info',
            message: [
                i18n.t('warnings.index.usingDirectMethodToSendEmail'),
                i18n.t('common.seeLinkForInstructions',
                       {link: '<a href=\'http://support.ghost.org/mail\' target=\'_blank\'>http://support.ghost.org/mail</a>'})
            ].join(' ')
        }]}, {context: {internal: true}});
    }
    if (mailer.state && mailer.state.emailDisabled) {
        api.notifications.add({notifications: [{
            type: 'warn',
            message: [
                i18n.t('warnings.index.unableToSendEmail'),
                i18n.t('common.seeLinkForInstructions',
                       {link: '<a href=\'http://support.ghost.org/mail\' target=\'_blank\'>http://support.ghost.org/mail</a>'})
            ].join(' ')
        }]}, {context: {internal: true}});
    }
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
        // Make sure javascript files have been built via grunt concat
        return builtFilesExist();
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
            // Initialize mail
            mailer.init(),
            // Initialize apps
            apps.init(),
            // Initialize sitemaps
            sitemap.init(),
            // Initialize xmrpc ping
            xmlrpc.init()
        );
    }).then(function () {
        var adminHbs = hbs.create();

        // Output necessary notifications on init
        initNotifications();
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
