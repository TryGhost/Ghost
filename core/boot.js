// The Ghost Boot Sequence
// -----------------------
// - This is intentionally one big file at the moment, so that we don't have to follow boot logic all over the place
// - This file is FULL of debug statements so we can see timings for the various steps because the boot needs to be as fast as possible
// - As we manage to break the codebase down into distinct components for e.g. the frontend, their boot logic can be offloaded to them
// - app.js is separate as the first example of each component having it's own app.js file colocated with it, instead of inside of server/web

// IMPORTANT: The only global requires here should be overrides + debug so we can monitor timings with DEBUG=ghost:boot* node ghost
require('./server/overrides');
const debug = require('ghost-ignition').debug('boot');
// END OF GLOBAL REQUIRES

class BootLogger {
    constructor(logging, startTime) {
        this.logging = logging;
        this.startTime = startTime;
    }
    log(message) {
        let {logging, startTime} = this;
        logging.info(`Ghost ${message} in ${(Date.now() - startTime) / 1000}s`);
    }
}

/**
  * Get the Database into a ready state
  * - DatabaseStateManager handles doing all this for us
  * - Passing logging makes it output state messages
  */
async function initDatabase({config, logging}) {
    const DatabaseStateManager = require('./server/data/db/state-manager');
    const dbStateManager = new DatabaseStateManager({knexMigratorFilePath: config.get('paths:appRoot')});
    await dbStateManager.makeReady({logging});
}

/**
 * Core is intended to be all the bits of Ghost that are shared and we can't do anything without
 * (There's more to do to make this true)
 */
async function initCore({ghostServer}) {
    debug('Begin: initCore');
    const settings = require('./server/services/settings');
    const jobService = require('./server/services/jobs');
    const models = require('./server/models');
    const {events, i18n} = require('./server/lib/common');

    ghostServer.registerCleanupTask(async () => {
        await jobService.shutdown();
    });

    // Initialize Ghost core internationalization
    i18n.init();
    debug('Default i18n done for core');

    models.init();
    debug('Models done');

    await settings.init();

    // @TODO: fix this - has to happen before db.ready is emitted
    debug('Begin: Url Service');
    require('./frontend/services/url');
    debug('End: Url Service');

    // @TODO: fix this location
    events.emit('db.ready');
    debug('End: initCore');
}

/**
 * Frontend is intended to be just Ghost's frontend
 * This is technically wrong atm because the theme service & frontend settings services contain
 * code used by the API to upload themes and settings
 */
async function initFrontend() {
    debug('Begin: initFrontend');
    const themeService = require('./frontend/services/themes');
    const frontendSettings = require('./frontend/services/settings');

    await frontendSettings.init();
    debug('Frontend settings done');

    await themeService.init();
    debug('Themes done');

    debug('End: initFrontend');
}

/**
 * At the moment we load our express apps all in one go, they require themselves and are co-located
 * What we want is to be able to optionally load various components and mount them
 * So eventually this function should go away
 */
async function initExpressApps() {
    debug('Begin: initExpressApps');
    const parentApp = require('./server/web/parent/app')();

    // @TODO: fix this
    const {events} = require('./server/lib/common');
    events.emit('themes.ready');

    debug('End: initExpressApps');
    return parentApp;
}

/**
 * Services are components that make up part of Ghost and need initialising on boot
 * These services should all be part of core, frontend services should be loaded with the frontend
 * We are working towards this being a service loader, with the ability to make certain services optional
 */
async function initServices({config}) {
    debug('Begin: initServices');
    const themeService = require('./frontend/services/themes');
    const frontendSettings = require('./frontend/services/settings');
    const appService = require('./frontend/services/apps');
    const urlUtils = require('./shared/url-utils');

    // CASE: When Ghost is ready with bootstrapping (db migrations etc.), we can trigger the router creation.
    //       Reason is that the routers access the routes.yaml, which shouldn't and doesn't have to be validated to
    //       start Ghost in maintenance mode.
    // Routing is currently a bridge between the frontend and API
    const routing = require('./frontend/services/routing');
    // We pass the themeService API version here, so that the frontend services are less tightly-coupled
    routing.bootstrap.start(themeService.getApiVersion());

    const settings = require('./server/services/settings');
    const permissions = require('./server/services/permissions');
    const xmlrpc = require('./server/services/xmlrpc');
    const slack = require('./server/services/slack');
    const {mega} = require('./server/services/mega');
    const webhooks = require('./server/services/webhooks');
    const scheduling = require('./server/adapters/scheduling');
    const getRoutesHash = () => frontendSettings.getCurrentHash('routes');

    await Promise.all([
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
        require('./server/analytics-events').init();
    }

    debug('End: initServices');
}

/**
 * Kick off recurring and background jobs
 * These are things that happen on boot, but we don't need to wait for them to finish
 */
async function initRecurringJobs({config}) {
    debug('Begin: initRecurringJobs');
    // we don't want to kick off scheduled/recurring jobs that will interfere with tests
    if (process.env.NODE_ENV.match(/^testing/)) {
        return;
    }

    if (config.get('backgroundJobs:emailAnalytics')) {
        const emailAnalyticsJobs = require('./server/services/email-analytics/jobs');
        await emailAnalyticsJobs.scheduleRecurringJobs();
    }

    debug('End: initRecurringJobs');
}

/**
 * Mount the now loaded main Ghost App onto our pre-loaded root app
 * - Now that we have the Ghost App ready to receive requests, disable global maintenance mode
 */
function mountGhost(rootApp, ghostApp) {
    debug('Begin: mountGhost');
    const urlService = require('./frontend/services/url');
    rootApp.disable('maintenance');
    rootApp.use(urlService.utils.getSubdir(), ghostApp);
    debug('End: mountGhost');
}

/**
 * ----------------------------------
 * Boot Ghost - The magic starts here
 * ----------------------------------
 *
 * - This function is written with async/await so you can read, line by line, what happens on boot
 * - All the functions above handle init/boot logic for a single component
 */
async function bootGhost() {
    // Metrics
    const startTime = Date.now();
    debug('Begin Boot');
    let ghostServer;

    try {
        // Config must be the first thing we do, because it is required for absolutely everything
        debug('Begin: Load config');
        const config = require('./shared/config');
        debug('End: Load config');

        // Version is required by sentry & Migratior config & so is fundamental to booting
        // However, it involves reading package.json so its slow
        // It's here for visibility on slowness
        debug('Begin: Load version info');
        require('./server/lib/ghost-version');
        debug('End: Load version info');

        // Logging is used absolutely everywhere
        debug('Begin: Load logging');
        const logging = require('./shared/logging');
        const bootLogger = new BootLogger(logging, startTime);
        debug('End: Load logging');

        // Sentry must be initialised early, but requires config
        debug('Begin: Load sentry');
        require('./shared/sentry');
        debug('End: Load sentry');

        // Start server with minimal app in maintenance mode
        debug('Begin: load server + minimal app');
        const rootApp = require('./app');
        const GhostServer = require('./server/ghost-server');
        ghostServer = new GhostServer();
        await ghostServer.start(rootApp);
        bootLogger.log('server started');
        // @TODO: move this
        ghostServer.rootApp = rootApp;
        debug('End: load server + minimal app');

        // Get the DB ready
        debug('Begin: Get DB ready');
        await initDatabase({config, logging});
        bootLogger.log('database ready');
        debug('End: Get DB ready');

        // Load Ghost with all its services
        debug('Begin: Load Ghost Core Services');
        await initCore({ghostServer});
        await initFrontend();
        const ghostApp = await initExpressApps({});
        await initServices({config});
        debug('End: Load Ghost Core Services');

        // Mount the full Ghost app onto the minimal root app & disable maintenance mode
        mountGhost(rootApp, ghostApp);

        // We are technically done here
        bootLogger.log('booted');
        debug('boot announcing readiness');
        GhostServer.announceServerReadiness();

        // Init our background jobs, we don't wait for this to finish
        initRecurringJobs({config});

        // We return the server for testing purposes
        debug('End Boot: Returning Ghost Server');
        return ghostServer;
    } catch (error) {
        const errors = require('@tryghost/errors');
        // @TODO: fix these extra requires
        const GhostServer = require('./server/ghost-server');
        const logging = require('./shared/logging');

        let serverStartError = error;

        if (!errors.utils.isIgnitionError(serverStartError)) {
            serverStartError = new errors.GhostError({message: serverStartError.message, err: serverStartError});
        }

        logging.error(serverStartError);
        GhostServer.announceServerReadiness(serverStartError);

        // If ghost was started and something else went wrong, we shut it down
        if (ghostServer) {
            ghostServer.shutdown(2);
        } else {
            // Ghost server failed to start, set a timeout to give logging a chance to flush
            setTimeout(() => {
                process.exit(2);
            }, 100);
        }
    }
}

module.exports = bootGhost;
