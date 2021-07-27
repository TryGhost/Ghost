// The Ghost Boot Sequence
// -----------------------
// - This is intentionally one big file at the moment, so that we don't have to follow boot logic all over the place
// - This file is FULL of debug statements so we can see timings for the various steps because the boot needs to be as fast as possible
// - As we manage to break the codebase down into distinct components for e.g. the frontend, their boot logic can be offloaded to them
// - app.js is separate as the first example of each component having it's own app.js file colocated with it, instead of inside of server/web
//
// IMPORTANT:
// ----------
// The only global requires here should be overrides + debug so we can monitor timings with DEBUG = ghost: boot * node ghost
require('./server/overrides');
const debug = require('@tryghost/debug')('boot');
// END OF GLOBAL REQUIRES

/**
 * Helper class to create consistent log messages
 */
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
 * Helper function to handle sending server ready notifications
 * @param {string} [error]
 */
function notifyServerReady(error) {
    const notify = require('./server/notify');

    if (error) {
        debug('Notifying server ready (error)');
        notify.notifyServerReady(error);
    } else {
        debug('Notifying server ready (success)');
        notify.notifyServerReady();
    }
}

/**
  * Get the Database into a ready state
  * - DatabaseStateManager handles doing all this for us
  * - Passing logging makes it output state messages
  *
  * @param {object} options
  * @param {object} options.config
  * @param {object} options.logging
  */
async function initDatabase({config, logging}) {
    const DatabaseStateManager = require('./server/data/db/state-manager');
    const dbStateManager = new DatabaseStateManager({knexMigratorFilePath: config.get('paths:appRoot')});
    await dbStateManager.makeReady({logging});
}

/**
 * Core is intended to be all the bits of Ghost that are fundamental and we can't do anything without them!
 * (There's more to do to make this true)
 * @param {object} options
 * @param {object} options.ghostServer
 * @param {object} options.config
 */
async function initCore({ghostServer, config}) {
    debug('Begin: initCore');

    // URL Utils is a bit slow, put it here so the timing is visible separate from models
    debug('Begin: Load urlUtils');
    require('./shared/url-utils');
    debug('End: Load urlUtils');

    // Models are the heart of Ghost - this is a syncronous operation
    debug('Begin: models');
    const models = require('./server/models');
    models.init();
    debug('End: models');

    // Settings are a core concept we use settings to store key-value pairs used in critical pathways as well as public data like the site title
    debug('Begin: settings');
    const settings = require('./server/services/settings');
    await settings.init();
    await settings.syncEmailSettings(config.get('hostSettings:emailVerification:verified'));
    debug('End: settings');

    // The URLService is a core part of Ghost, which depends on models. It needs moving from the frontend to make this clear.
    debug('Begin: Url Service');
    const urlService = require('./frontend/services/url');
    // Note: there is no await here, we do not wait for the url service to finish
    // We can return, but the site will remain in (the shared, not global) maintenance mode until this finishes
    // This is managed on request: https://github.com/TryGhost/Ghost/blob/main/core/server/web/shared/middlewares/maintenance.js#L13
    urlService.init();
    debug('End: Url Service');

    // Job Service allows parts of Ghost to run in the background
    debug('Begin: Job Service');
    const jobService = require('./server/services/jobs');
    ghostServer.registerCleanupTask(async () => {
        await jobService.shutdown();
    });
    debug('End: Job Service');

    debug('End: initCore');
}

/**
 * Frontend is intended to be just Ghost's frontend
 * This is technically wrong currently because the theme & frontend settings services contain code used by the API to upload themes & settings
 */
async function initFrontend() {
    debug('Begin: initFrontend');

    debug('Begin: Frontend Settings');
    const frontendSettings = require('./frontend/services/settings');
    await frontendSettings.init();
    debug('End: Frontend Settings');

    debug('Begin: Themes');
    const themeService = require('./server/services/themes');
    await themeService.init();
    debug('End: Themes');

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
    debug('End: initExpressApps');
    return parentApp;
}

/**
 * Dynamic routing is generated from the routes.yaml file, which is part of the settings service
 * When Ghost's DB and core are loaded, we can access this file and call routing.bootstrap.start
 * However this _must_ happen after the express Apps are loaded, hence why this is here and not in initFrontend
 * Routing is currently tightly coupled between the frontend and backend
 */
async function initDynamicRouting() {
    debug('Begin: Dynamic Routing');
    const routing = require('./frontend/services/routing');
    const frontendSettings = require('./frontend/services/settings');
    const bridge = require('./bridge');

    // We pass the frontend API version + the dynamic routes here, so that the frontend services are slightly less tightly-coupled
    const apiVersion = bridge.getFrontendApiVersion();
    const routeSettings = frontendSettings.get('routes');
    debug(`Frontend API Version: ${apiVersion}`);

    routing.bootstrap.start(apiVersion, routeSettings);
    const getRoutesHash = () => frontendSettings.getCurrentHash('routes');

    const settings = require('./server/services/settings');
    await settings.syncRoutesHash(getRoutesHash);

    debug('End: Dynamic Routing');
}

/**
 * Services are components that make up part of Ghost and need initializing on boot
 * These services should all be part of core, frontend services should be loaded with the frontend
 * We are working towards this being a service loader, with the ability to make certain services optional
 *
 * @param {object} options
 * @param {object} options.config
 */
async function initServices({config}) {
    debug('Begin: initServices');

    const defaultApiVersion = config.get('api:versions:default');
    debug(`Default API Version: ${defaultApiVersion}`);

    debug('Begin: Services');
    const members = require('./server/services/members');
    const permissions = require('./server/services/permissions');
    const xmlrpc = require('./server/services/xmlrpc');
    const slack = require('./server/services/slack');
    const {mega} = require('./server/services/mega');
    const webhooks = require('./server/services/webhooks');
    const appService = require('./frontend/services/apps');
    const limits = require('./server/services/limits');
    const scheduling = require('./server/adapters/scheduling');

    const urlUtils = require('./shared/url-utils');

    // NOTE: limits service has to be initialized first
    // in case it limits initialization of any other service (e.g. webhooks)
    await limits.init();

    await Promise.all([
        members.init(),
        permissions.init(),
        xmlrpc.listen(),
        slack.listen(),
        mega.listen(),
        webhooks.listen(),
        appService.init(),
        scheduling.init({
            apiUrl: urlUtils.urlFor('api', {version: defaultApiVersion, versionType: 'admin'}, true)
        })
    ]);
    debug('End: Services');

    // Initialize analytics events
    if (config.get('segment:key')) {
        require('./server/analytics-events').init();
    }

    debug('End: initServices');
}

/**
 * Kick off recurring jobs and background services
 * These are things that happen on boot, but we don't need to wait for them to finish
 * Later, this might be a service hook:q

 * @param {object} options
 * @param {object} options.config
 */
async function initBackgroundServices({config}) {
    debug('Begin: initBackgroundServices');

    // Load all inactive themes
    const themeService = require('./server/services/themes');
    themeService.loadInactiveThemes();

    // we don't want to kick off background services that will interfere with tests
    if (process.env.NODE_ENV.match(/^testing/)) {
        return;
    }

    // Load email analytics recurring jobs
    if (config.get('backgroundJobs:emailAnalytics')) {
        const emailAnalyticsJobs = require('./server/services/email-analytics/jobs');
        await emailAnalyticsJobs.scheduleRecurringJobs();
    }

    const updateCheck = require('./server/update-check');
    updateCheck.scheduleRecurringJobs();

    debug('End: initBackgroundServices');
}

/**
 * ----------------------------------
 * Boot Ghost - The magic starts here
 * ----------------------------------
 *
 * - This function is written with async/await so you can read, line by line, what happens on boot
 * - All the functions above handle init/boot logic for a single component

 * @returns {Promise<object>} ghostServer
 */
async function bootGhost() {
    // Metrics
    const startTime = Date.now();
    debug('Begin Boot');

    // We need access to these variables in both the try and catch block
    let bootLogger;
    let config;
    let ghostServer;
    let logging;

    // These require their own try-catch block and error format, because we can't log an error if logging isn't working
    try {
        // Step 0 - Load config and logging - fundamental required components
        // Config must be the first thing we do, because it is required for absolutely everything
        debug('Begin: Load config');
        config = require('./shared/config');
        debug('End: Load config');

        // Logging is used absolutely everywhere
        debug('Begin: Load logging');
        logging = require('@tryghost/logging');
        bootLogger = new BootLogger(logging, startTime);
        debug('End: Load logging');

        // At this point logging is required, so we can handle errors better
    } catch (error) {
        console.error(error); // eslint-disable-line no-console
        process.exit(1);
    }

    try {
        // Step 1 - require more fundamental components
        // Version is required by sentry & Migration config & so is fundamental to booting
        // However, it involves reading package.json so its slow & it's here for visibility on that slowness
        debug('Begin: Load version info');
        require('@tryghost/version');
        debug('End: Load version info');

        // Sentry must be initialized early, but requires config
        debug('Begin: Load sentry');
        require('./shared/sentry');
        debug('End: Load sentry');

        // I18n is basically used to colocate all of our error message strings & required to log server start messages
        debug('Begin: i18n');
        const i18n = require('./shared/i18n');
        i18n.init();
        debug('End: i18n');

        // Step 2 - Start server with minimal app in global maintenance mode
        debug('Begin: load server + minimal app');
        const rootApp = require('./app');
        const GhostServer = require('./server/ghost-server');
        ghostServer = new GhostServer({url: config.getSiteUrl()});
        await ghostServer.start(rootApp);
        bootLogger.log('server started');
        debug('End: load server + minimal app');

        // Step 3 - Get the DB ready
        debug('Begin: Get DB ready');
        await initDatabase({config, logging});
        bootLogger.log('database ready');
        debug('End: Get DB ready');

        // Step 4 - Load Ghost with all its services
        debug('Begin: Load Ghost Services & Apps');
        await initCore({ghostServer, config});
        await initFrontend();
        const ghostApp = await initExpressApps();
        await initDynamicRouting();
        await initServices({config});
        debug('End: Load Ghost Services & Apps');

        // Step 5 - Mount the full Ghost app onto the minimal root app & disable maintenance mode
        debug('Begin: mountGhost');
        rootApp.disable('maintenance');
        rootApp.use(config.getSubdir(), ghostApp);
        debug('End: mountGhost');

        // Step 6 - We are technically done here - let everyone know!
        bootLogger.log('booted');
        notifyServerReady();

        // Step 7 - Init our background services, we don't wait for this to finish
        initBackgroundServices({config});

        // We return the server purely for testing purposes
        debug('End Boot: Returning Ghost Server');
        return ghostServer;
    } catch (error) {
        const errors = require('@tryghost/errors');

        // Ensure the error we have is an ignition error
        let serverStartError = error;
        if (!errors.utils.isIgnitionError(serverStartError)) {
            serverStartError = new errors.GhostError({message: serverStartError.message, err: serverStartError});
        }

        logging.error(serverStartError);

        // If ghost was started and something else went wrong, we shut it down
        if (ghostServer) {
            notifyServerReady(serverStartError);
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
