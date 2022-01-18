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
    constructor(logging, metrics, startTime) {
        this.logging = logging;
        this.metrics = metrics;
        this.startTime = startTime;
    }
    log(message) {
        let {logging, startTime} = this;
        logging.info(`Ghost ${message} in ${(Date.now() - startTime) / 1000}s`);
    }
    metric(name) {
        let {metrics, startTime} = this;
        metrics.metric(name, Date.now() - startTime);
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
  *
  * @param {object} options
  * @param {object} options.config
  */
async function initDatabase({config}) {
    const DatabaseStateManager = require('./server/data/db/state-manager');
    const dbStateManager = new DatabaseStateManager({knexMigratorFilePath: config.get('paths:appRoot')});
    await dbStateManager.makeReady();

    const databaseInfo = require('./server/data/db/info');
    await databaseInfo.init();
}

/**
 * Core is intended to be all the bits of Ghost that are fundamental and we can't do anything without them!
 * (There's more to do to make this true)
 * @param {object} options
 * @param {object} options.ghostServer
 * @param {object} options.config
 * @param {object} options.bootLogger
 * @param {boolean} options.frontend
 */
async function initCore({ghostServer, config, bootLogger, frontend}) {
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

    // The URLService is a core part of Ghost, which depends on models.
    debug('Begin: Url Service');
    const urlService = require('./server/services/url');
    // Note: there is no await here, we do not wait for the url service to finish
    // We can return, but the site will remain in maintenance mode until this finishes
    // This is managed on request: https://github.com/TryGhost/Ghost/blob/main/core/app.js#L10
    urlService.init({
        onFinished: () => {
            bootLogger.log('URL Service Ready');
        },
        urlCache: !frontend // hacky parameter to make the cache initialization kick in as we can't initialize labs before the boot
    });
    debug('End: Url Service');

    if (ghostServer) {
        // Job Service allows parts of Ghost to run in the background
        debug('Begin: Job Service');
        const jobService = require('./server/services/jobs');
        ghostServer.registerCleanupTask(async () => {
            await jobService.shutdown();
        });
        debug('End: Job Service');

        ghostServer.registerCleanupTask(async () => {
            await urlService.shutdown();
        });
    }

    debug('End: initCore');
}

/**
 * These are services required by Ghost's frontend.
 */
async function initServicesForFrontend() {
    debug('Begin: initServicesForFrontend');

    debug('Begin: Routing Settings');
    const routeSettings = require('./server/services/route-settings');
    await routeSettings.init();
    debug('End: Routing Settings');

    debug('Begin: Redirects');
    const customRedirects = require('./server/services/redirects');
    await customRedirects.init(),
    debug('End: Redirects');

    debug('Begin: Themes');
    // customThemSettingsService.api must be initialized before any theme activation occurs
    const customThemeSettingsService = require('./server/services/custom-theme-settings');
    customThemeSettingsService.init();
    const themeService = require('./server/services/themes');
    await themeService.init();
    debug('End: Themes');

    debug('End: initServicesForFrontend');
}

/**
 * Frontend is intended to be just Ghost's frontend
 */
async function initFrontend() {
    debug('Begin: initFrontend');

    const helperService = require('./frontend/services/helpers');
    await helperService.init();

    debug('End: initFrontend');
}

/**
 * At the moment we load our express apps all in one go, they require themselves and are co-located
 * What we want is to be able to optionally load various components and mount them
 * So eventually this function should go away
 * @param {Object} options
 * @param {Boolean} options.backend
 * @param {Boolean} options.frontend
 * @param {Object} options.config
 */
async function initExpressApps({frontend, backend, config}) {
    debug('Begin: initExpressApps');

    const parentApp = require('./server/web/parent/app')();
    const vhost = require('@tryghost/vhost-middleware');

    // Mount the express apps on the parentApp
    if (backend) {
        // ADMIN + API
        const backendApp = require('./server/web/parent/backend')();
        parentApp.use(vhost(config.getBackendMountPath(), backendApp));
    }

    if (frontend) {
        // SITE + MEMBERS
        const frontendApp = require('./server/web/parent/frontend')({});
        parentApp.use(vhost(config.getFrontendMountPath(), frontendApp));
    }

    debug('End: initExpressApps');
    return parentApp;
}

/**
 * Dynamic routing is generated from the routes.yaml file
 * When Ghost's DB and core are loaded, we can access this file and call routing.routingManager.start
 * However this _must_ happen after the express Apps are loaded, hence why this is here and not in initFrontend
 * Routing is currently tightly coupled between the frontend and backend
 */
async function initDynamicRouting() {
    debug('Begin: Dynamic Routing');
    const routing = require('./frontend/services/routing');
    const routeSettingsService = require('./server/services/route-settings');
    const bridge = require('./bridge');
    bridge.init();

    // We pass the frontend API version + the dynamic routes here, so that the frontend services are slightly less tightly-coupled
    const apiVersion = bridge.getFrontendApiVersion();
    const routeSettings = await routeSettingsService.loadRouteSettings();
    debug(`Frontend API Version: ${apiVersion}`);

    routing.routerManager.start(apiVersion, routeSettings);
    const getRoutesHash = () => routeSettingsService.api.getCurrentHash();

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
    const stripe = require('./server/services/stripe');
    const members = require('./server/services/members');
    const offers = require('./server/services/offers');
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

    // NOTE: Members service depends on these
    //       so they are initialized before it.
    await stripe.init();
    await offers.init();

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
 * Later, this might be a service hook

 * @param {object} options
 * @param {object} options.config
 */
async function initBackgroundServices({config}) {
    debug('Begin: initBackgroundServices');

    // Load all inactive themes
    const themeService = require('./server/services/themes');
    themeService.loadInactiveThemes();

    // we don't want to kick off background services that will interfere with tests
    if (process.env.NODE_ENV.startsWith('test')) {
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
async function bootGhost({backend = true, frontend = true, server = true} = {}) {
    // Metrics
    const startTime = Date.now();
    debug('Begin Boot');

    // We need access to these variables in both the try and catch block
    let bootLogger;
    let config;
    let ghostServer;
    let logging;
    let metrics;

    // These require their own try-catch block and error format, because we can't log an error if logging isn't working
    try {
        // Step 0 - Load config and logging - fundamental required components
        // Version is required by logging, sentry & Migration config & so is fundamental to booting
        // However, it involves reading package.json so its slow & it's here for visibility on that slowness
        debug('Begin: Load version info');
        require('@tryghost/version');
        debug('End: Load version info');

        // Loading config must be the first thing we do, because it is required for absolutely everything
        debug('Begin: Load config');
        config = require('./shared/config');
        debug('End: Load config');

        // Logging is also used absolutely everywhere
        debug('Begin: Load logging');
        logging = require('@tryghost/logging');
        metrics = require('@tryghost/metrics');
        bootLogger = new BootLogger(logging, metrics, startTime);
        debug('End: Load logging');

        // At this point logging is required, so we can handle errors better
    } catch (error) {
        console.error(error); // eslint-disable-line no-console
        process.exit(1);
    }

    try {
        // Step 1 - require more fundamental components
        // Sentry must be initialized early, but requires config
        debug('Begin: Load sentry');
        require('./shared/sentry');
        debug('End: Load sentry');

        // Step 2 - Start server with minimal app in global maintenance mode
        debug('Begin: load server + minimal app');
        const rootApp = require('./app')();

        if (server) {
            const GhostServer = require('./server/ghost-server');
            ghostServer = new GhostServer({url: config.getSiteUrl()});
            await ghostServer.start(rootApp);
            bootLogger.log('server started');
            debug('End: load server + minimal app');
        }

        // Step 3 - Get the DB ready
        debug('Begin: Get DB ready');
        await initDatabase({config});
        bootLogger.log('database ready');
        debug('End: Get DB ready');

        // Step 4 - Load Ghost with all its services
        debug('Begin: Load Ghost Services & Apps');
        await initCore({ghostServer, config, bootLogger, frontend});
        await initServicesForFrontend();

        if (frontend) {
            await initFrontend();
        }
        const ghostApp = await initExpressApps({frontend, backend, config});

        if (frontend) {
            await initDynamicRouting();
        }

        await initServices({config});
        debug('End: Load Ghost Services & Apps');

        // Step 5 - Mount the full Ghost app onto the minimal root app & disable maintenance mode
        debug('Begin: mountGhost');
        rootApp.disable('maintenance');
        rootApp.use(config.getSubdir(), ghostApp);
        debug('End: mountGhost');

        // Step 6 - We are technically done here - let everyone know!
        bootLogger.log('booted');
        bootLogger.metric('boot-time');
        notifyServerReady();

        // Step 7 - Init our background services, we don't wait for this to finish
        initBackgroundServices({config});

        // We return the server purely for testing purposes
        if (server) {
            debug('End Boot: Returning Ghost Server');
            return ghostServer;
        } else {
            debug('End boot: Returning Root App');
            return rootApp;
        }
    } catch (error) {
        const errors = require('@tryghost/errors');

        // Ensure the error we have is an ignition error
        let serverStartError = error;
        if (!errors.utils.isGhostError(serverStartError)) {
            serverStartError = new errors.InternalServerError({message: serverStartError.message, err: serverStartError});
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
