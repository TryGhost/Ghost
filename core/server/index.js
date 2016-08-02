// # Bootup
// This file needs serious love & refactoring

// Module dependencies
var express = require('express'),
    _ = require('lodash'),
    uuid = require('node-uuid'),
    Promise = require('bluebird'),
    i18n = require('./i18n'),
    api = require('./api'),
    config = require('./config'),
    errors = require('./errors'),
    middleware = require('./middleware'),
    migrations = require('./data/migration'),
    versioning = require('./data/schema/versioning'),
    models = require('./models'),
    permissions = require('./permissions'),
    apps = require('./apps'),
    sitemap = require('./data/xml/sitemap'),
    xmlrpc = require('./data/xml/xmlrpc'),
    slack = require('./data/slack'),
    GhostServer = require('./ghost-server'),
    scheduling = require('./scheduling'),
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
    options = options || {};

    var ghostServer = null;

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
        models.init();
    }).then(function () {
        return versioning.getDatabaseVersion()
            .then(function (currentVersion) {
                var response = migrations.update.isDatabaseOutOfDate({
                    fromVersion: currentVersion,
                    toVersion: versioning.getNewestDatabaseVersion(),
                    forceMigration: process.env.FORCE_MIGRATION
                }), maintenanceState;

                if (response.migrate === true) {
                    maintenanceState = config.maintenance.enabled || false;
                    config.maintenance.enabled = true;

                    migrations.update.execute({
                        fromVersion: currentVersion,
                        toVersion: versioning.getNewestDatabaseVersion(),
                        forceMigration: process.env.FORCE_MIGRATION
                    }).then(function () {
                        config.maintenance.enabled = maintenanceState;
                    }).catch(function (err) {
                        errors.logErrorAndExit(err, err.context, err.help);
                    });
                } else if (response.error) {
                    return Promise.reject(response.error);
                }
            })
            .catch(function (err) {
                if (err instanceof errors.DatabaseNotPopulated) {
                    return migrations.populate();
                }

                return Promise.reject(err);
            });
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
            xmlrpc.listen(),
            // Initialize slack ping
            slack.listen()
        );
    }).then(function () {
        // Get reference to an express app instance.
        var parentApp = express();

        // ## Middleware and Routing
        middleware(parentApp);

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

        return new GhostServer(parentApp);
    }).then(function (_ghostServer) {
        ghostServer = _ghostServer;

        // scheduling can trigger api requests, that's why we initialize the module after the ghost server creation
        // scheduling module can create x schedulers with different adapters
        return scheduling.init(_.extend(config.scheduling, {apiUrl: config.url + config.urlFor('api')}));
    }).then(function () {
        return ghostServer;
    });
}

module.exports = init;
