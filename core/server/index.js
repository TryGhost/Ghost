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
var debug = require('ghost-ignition').debug('boot:init'),
// Config should be first require, as it triggers the initial load of the config files
    config = require('./config'),
    Promise = require('bluebird'),
    logging = require('./logging'),
    i18n = require('./i18n'),
    models = require('./models'),
    permissions = require('./permissions'),
    apps = require('./apps'),
    auth = require('./auth'),
    dbHealth = require('./data/db/health'),
    xmlrpc = require('./data/xml/xmlrpc'),
    slack = require('./data/slack'),
    GhostServer = require('./ghost-server'),
    scheduling = require('./adapters/scheduling'),
    settings = require('./settings'),
    settingsCache = require('./settings/cache'),
    themes = require('./themes'),
    utils = require('./utils');

// ## Initialise Ghost
function init() {
    debug('Init Start...');

    var ghostServer, parentApp;

    // Initialize Internationalization
    i18n.init();
    debug('I18n done');
    models.init();
    debug('models done');

    return dbHealth.check().then(function () {
        debug('DB health check done');
        // Populate any missing default settings
        // Refresh the API settings cache
        return settings.init();
    }).then(function () {
        debug('Update settings cache done');
        // Initialize the permissions actions and objects
        return permissions.init();
    }).then(function () {
        debug('Permissions done');
        return Promise.join(
            themes.init(),
            // Initialize apps
            apps.init(),
            // Initialize xmrpc ping
            xmlrpc.listen(),
            // Initialize slack ping
            slack.listen()
        );
    }).then(function () {
        debug('Apps, XMLRPC, Slack done');

        // Setup our collection of express apps
        parentApp = require('./app')();

        // Initialise analytics events
        if (config.get('segment:key')) {
            require('./analytics-events').init();
        }

        debug('Express Apps done');
    }).then(function () {
        return auth.validation.validate({
            authType: config.get('auth:type')
        });
    }).then(function () {
        // runs asynchronous
        auth.init({
            authType: config.get('auth:type'),
            ghostAuthUrl: config.get('auth:url'),
            redirectUri: utils.url.urlFor('admin', true),
            clientUri: utils.url.urlFor('home', true),
            clientName: settingsCache.get('title'),
            clientDescription: settingsCache.get('description')
        }).then(function (response) {
            parentApp.use(response.auth);
        }).catch(function onAuthError(err) {
            logging.error(err);
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
            schedulerUrl: config.get('scheduling').schedulerUrl,
            active: config.get('scheduling').active,
            apiUrl: utils.url.urlFor('api', true),
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
