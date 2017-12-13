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
    config = require('./config'),
    Promise = require('bluebird'),
    common = require('./lib/common'),
    models = require('./models'),
    permissions = require('./permissions'),
    auth = require('./auth'),
    dbHealth = require('./data/db/health'),
    GhostServer = require('./ghost-server'),
    scheduling = require('./adapters/scheduling'),
    settings = require('./settings'),
    themes = require('./themes'),
    urlService = require('./services/url'),

    // Services that need initialisation
    apps = require('./services/apps'),
    xmlrpc = require('./services/xmlrpc'),
    slack = require('./services/slack'),
    webhooks = require('./services/webhooks');

// ## Initialise Ghost
function init() {
    debug('Init Start...');

    var ghostServer, parentApp;

    // Initialize Internationalization
    common.i18n.init();
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
            slack.listen(),
            // Initialize webhook pings
            webhooks.listen()
        );
    }).then(function () {
        debug('Apps, XMLRPC, Slack done');

        // Setup our collection of express apps
        parentApp = require('./web/parent-app')();

        // Initialise analytics events
        if (config.get('segment:key')) {
            require('./analytics-events').init();
        }

        debug('Express Apps done');
    }).then(function () {
        parentApp.use(auth.init());
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
            apiUrl: urlService.utils.urlFor('api', true),
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
