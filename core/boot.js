// # The Ghost Boot Sequence

// IMPORTANT: The only global requires here should be debug + overrides
const debug = require('ghost-ignition').debug('boot');
require('./server/overrides');
// END OF GLOBAL REQUIRES

const initCore = async ({ghostServer}) => {
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
};

const initExpressApps = async () => {
    debug('Begin: initExpressApps');
    const themeService = require('./frontend/services/themes');
    const frontendSettings = require('./frontend/services/settings');

    await frontendSettings.init();
    debug('Frontend settings done');

    await themeService.init();
    debug('Themes done');

    const parentApp = require('./server/web/parent/app')();

    debug('End: initExpressApps');
    return parentApp;
};

const initServices = async ({config}) => {
    debug('Begin: initialiseServices');
    const themeService = require('./frontend/services/themes');
    const frontendSettings = require('./frontend/services/settings');
    const appService = require('./frontend/services/apps');
    const urlUtils = require('./shared/url-utils');

    // CASE: When Ghost is ready with bootstrapping (db migrations etc.), we can trigger the router creation.
    //       Reason is that the routers access the routes.yaml, which shouldn't and doesn't have to be validated to
    //       start Ghost in maintenance mode.
    // Routing is a bridge between the frontend and API
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
        require('./server/analytics-events').init();
    }

    debug('End: initialiseServices');
};

const mountGhost = (rootApp, ghostApp) => {
    const urlService = require('./frontend/services/url');
    rootApp.disable('maintenance');
    rootApp.use(urlService.utils.getSubdir(), ghostApp);
};

const bootGhost = async () => {
    // Metrics & debugging
    const startTime = Date.now();
    let ghostServer;

    try {
        // Config is the absolute first thing to do!
        debug('Begin: Load config');
        const config = require('./shared/config');
        debug('End: Load config');

        debug('Begin: Load version info');
        const version = require('./server/lib/ghost-version');
        config.set('version', version);
        debug('End: Load version info');

        debug('Begin: load server + minimal app');
        process.env.NODE_ENV = process.env.NODE_ENV || 'development';

        // Get minimal application in maintenance mode
        const rootApp = require('./app');

        // Start server with minimal App
        const GhostServer = require('./server/ghost-server');
        ghostServer = new GhostServer();
        await ghostServer.start(rootApp);

        const logging = require('./shared/logging');
        logging.info('Ghost server start', (Date.now() - startTime) / 1000 + 's');
        debug('End: load server + minimal app');

        debug('Begin: Get DB ready');
        // Get the DB ready
        await require('./db').ready();
        debug('End: Get DB ready');

        // Load Ghost with all its services
        debug('Begin: Load Ghost Core Services');
        await initCore({ghostServer});

        const ghostApp = await initExpressApps({});
        await initServices({config});
        debug('End: Load Ghost Core Services');

        // Mount the full Ghost app onto the minimal root app & disable maintenance mode
        mountGhost(rootApp, ghostApp);

        // Announce Server Readiness
        logging.info('Ghost boot', (Date.now() - startTime) / 1000 + 's');
        GhostServer.announceServerReadiness();
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

        if (ghostServer) {
            ghostServer.shutdown(2);
        } else {
            setTimeout(() => {
                process.exit(2);
            }, 100);
        }
    }
};

module.exports = bootGhost;
