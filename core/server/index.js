/**
 * make sure overrides get's called first!
 * - keeping the overrides import here works for installing Ghost as npm!
 *
 * the call order is the following:
 * - root index requires core module
 * - core index requires server
 * - overrides is the first package to load
 */
require('./overrides');

const debug = require('ghost-ignition').debug('boot:init');
const Promise = require('bluebird');
const config = require('../shared/config');
const {events, i18n} = require('./lib/common');
const logging = require('../shared/logging');
const migrator = require('./data/db/migrator');
const urlUtils = require('./../shared/url-utils');
let parentApp;

// Frontend Components
const themeService = require('../frontend/services/themes');
const appService = require('../frontend/services/apps');
const frontendSettings = require('../frontend/services/settings');

async function initialiseServices() {
    // CASE: When Ghost is ready with bootstrapping (db migrations etc.), we can trigger the router creation.
    //       Reason is that the routers access the routes.yaml, which shouldn't and doesn't have to be validated to
    //       start Ghost in maintenance mode.
    // Routing is a bridge between the frontend and API
    const routing = require('../frontend/services/routing');
    // We pass the themeService API version here, so that the frontend services are less tightly-coupled
    routing.bootstrap.start(themeService.getApiVersion());

    const settings = require('./services/settings');
    const permissions = require('./services/permissions');
    const xmlrpc = require('./services/xmlrpc');
    const slack = require('./services/slack');
    const {mega} = require('./services/mega');
    const webhooks = require('./services/webhooks');
    const scheduling = require('./adapters/scheduling');

    debug('`initialiseServices` Start...');
    const getRoutesHash = () => frontendSettings.getCurrentHash('routes');

    await Promise.all([
        // Initialize the permissions actions and objects
        permissions.init(),
        xmlrpc.listen(),
        slack.listen(),
        mega.listen(),
        webhooks.listen(),
        settings.syncRoutesHash(getRoutesHash),
        appService.init(),
        scheduling.init({
            // NOTE: When changing API version need to consider how to migrate custom scheduling adapters
            //       that rely on URL to lookup persisted scheduled records (jobs, etc.). Ref: https://github.com/TryGhost/Ghost/pull/10726#issuecomment-489557162
            apiUrl: urlUtils.urlFor('api', {version: 'v3', versionType: 'admin'}, true)
        })
    ]);

    debug('XMLRPC, Slack, MEGA, Webhooks, Scheduling, Permissions done');

    // Initialise analytics events
    if (config.get('segment:key')) {
        require('./analytics-events').init();
    }

    debug('...`initialiseServices` End');
}

async function initializeRecurringJobs() {
    // we don't want to kick off scheduled/recurring jobs that will interfere with tests
    if (process.env.NODE_ENV.match(/^testing/)) {
        return;
    }

    if (config.get('backgroundJobs:emailAnalytics')) {
        const emailAnalyticsJobs = require('./services/email-analytics/jobs');
        await emailAnalyticsJobs.scheduleRecurringJobs();
    }
}

/**
 * - initialise models
 * - initialise i18n
 * - load all settings into settings cache (almost every component makes use of this cache)
 * - load active theme
 * - create our express apps (site, admin, api)
 * - start the ghost server
 * - enable maintenance mode if migrations are missing
 */
const minimalRequiredSetupToStartGhost = async (dbState) => {
    const settings = require('./services/settings');
    const jobService = require('./services/jobs');
    const models = require('./models');
    const GhostServer = require('./ghost-server');

    let ghostServer;

    // Initialize Ghost core internationalization
    i18n.init();
    debug('Default i18n done for core');

    models.init();
    debug('Models done');

    await settings.init();
    debug('Settings done');

    await frontendSettings.init();
    debug('Frontend settings done');

    await themeService.init();
    debug('Themes done');

    parentApp = require('./web/parent/app')();
    debug('Express Apps done');

    ghostServer = new GhostServer(parentApp);

    ghostServer.registerCleanupTask(async () => {
        await jobService.shutdown();
    });

    // CASE: all good or db was just initialised
    if (dbState === 1 || dbState === 2) {
        events.emit('db.ready');

        await initialiseServices();
        initializeRecurringJobs();
        return ghostServer;
    }

    // CASE: migrations required, put blog into maintenance mode
    if (dbState === 4) {
        logging.info('Blog is in maintenance mode.');

        config.set('maintenance:enabled', true);

        try {
            await migrator.migrate();

            await settings.reinit();
            events.emit('db.ready');

            await initialiseServices();

            config.set('maintenance:enabled', false);
            logging.info('Blog is out of maintenance mode.');

            await GhostServer.announceServerReadiness();

            initializeRecurringJobs();

            return ghostServer;
        } catch (err) {
            try {
                await GhostServer.announceServerReadiness(err);
            } finally {
                logging.error(err);
                setTimeout(() => {
                    process.exit(-1);
                }, 100);
            }
        }
    }
};

/**
 * Connect to database.
 * Check db state.
 */
const isDatabaseInitialisationRequired = async () => {
    const db = require('./data/db/connection');

    let dbState = await migrator.getState();

    // CASE: db initialisation required, wait till finished
    if (dbState === 2) {
        await migrator.dbInit();
    }

    // CASE: is db incompatible? e.g. you can't connect a 0.11 database with Ghost 1.0 or 2.0
    if (dbState === 3) {
        await migrator.isDbCompatible(db);

        dbState = 2;
        await migrator.dbInit();
    }

    return minimalRequiredSetupToStartGhost(dbState);
};

module.exports = isDatabaseInitialisationRequired;
