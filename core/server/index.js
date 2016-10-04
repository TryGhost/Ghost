// # Bootup
// This file needs serious love & refactoring

/**
 * make sure overrides get's called first!
 * - keeping the overrides require here works for installing Ghost as npm!
 *
 * the call order is the following:
 * - root index requires core module
 * - core index requires server
 * - overrides is the first package to load
 */
require('./overrides');

// Module dependencies
var debug = require('debug')('ghost:boot:init'),
    express = require('express'),
    uuid = require('node-uuid'),
    Promise = require('bluebird'),
    i18n = require('./i18n'),
    api = require('./api'),
    config = require('./config'),
    logging = require('./logging'),
    middleware = require('./middleware'),
    db = require('./data/schema'),
    models = require('./models'),
    permissions = require('./permissions'),
    apps = require('./apps'),
    auth = require('./auth'),
    xmlrpc = require('./data/xml/xmlrpc'),
    slack = require('./data/slack'),
    GhostServer = require('./ghost-server'),
    scheduling = require('./scheduling'),
    validateThemes = require('./utils/validate-themes'),
    readDirectory = require('./utils/read-directory'),
    utils = require('./utils'),
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
    debug('Init Start...');
    options = options || {};

    var ghostServer, parentApp;

    // ### Initialisation
    // The server and its dependencies require a populated config
    // It returns a promise that is resolved when the application
    // has finished starting up.

    // Initialize Internationalization
    i18n.init();
    debug('I18n done');

    return readDirectory(config.getContentPath('apps')).then(function loadThemes(result) {
        config.set('paths:availableApps', result);
        return api.themes.loadThemes();
    }).then(function () {
        debug('Themes & apps done');

        models.init();
        // @TODO: this is temporary, replace migrations with a warning if a DB exists
        return db.bootUp();
    }).then(function () {
        // Populate any missing default settings
        return models.Settings.populateDefaults();
    }).then(function () {
        debug('Models & database done');
        // Initialize the settings cache
        return api.init();
    }).then(function () {
        debug('API done');
        // Initialize the permissions actions and objects
        // NOTE: Must be done before initDbHashAndFirstRun calls
        return permissions.init();
    }).then(function () {
        debug('Permissions done');
        return Promise.join(
            // Check for or initialise a dbHash.
            initDbHashAndFirstRun(),
            // Initialize apps
            apps.init(),
            // Initialize xmrpc ping
            xmlrpc.listen(),
            // Initialize slack ping
            slack.listen()
        );
    }).then(function () {
        debug('Apps, XMLRPC, Slack done');
        // Get reference to an express app instance.
        parentApp = express();
        // ## Middleware and Routing
        middleware(parentApp);
        debug('Express done');

        // Log all theme errors and warnings
        validateThemes(config.getContentPath('themes'))
            .catch(function (result) {
                // TODO: change `result` to something better
                result.errors.forEach(function (err) {
                    logging.error(err);
                });

                result.warnings.forEach(function (warn) {
                    logging.warn(warn.message);
                });
            });

        return auth.init(config.get('auth'))
            .then(function (response) {
                parentApp.use(response.auth);
            });
    }).then(function () {
        debug('Auth done');
        return new GhostServer(parentApp);
    }).then(function (_ghostServer) {
        ghostServer = _ghostServer;

        // scheduling can trigger api requests, that's why we initialize the module after the ghost server creation
        // scheduling module can create x schedulers with different adapters
        debug('Server done');
        return scheduling.init({
            active: config.get('scheduling').active,
            apiUrl: utils.url.apiUrl(),
            internalPath: config.get('paths').internalSchedulingPath,
            contentPath: config.getContentPath('scheduling')
        });
    }).then(function () {
        debug('Scheduling done');
        debug('...Init End');
        return ghostServer;
    });
}

module.exports = init;
