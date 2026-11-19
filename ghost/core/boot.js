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
  /**
   * @param {Pick<import('@tryghost/logging').GhostLogger, 'info'>} logging
   * @param {{metric: (name: string, time: number) => unknown}} metrics
   * @param {number} startTime
   */
  constructor(logging, metrics, startTime) {
    this.logging = logging;
    this.metrics = metrics;
    this.startTime = startTime;
  }
  /**
   * @param {string} message
   * @returns {void}
   */
  log(message) {
    const { logging, startTime } = this;
    logging.info(`Ghost ${message} in ${(Date.now() - startTime) / 1000}s`);
  }
  /**
   * @param {string} name
   * @param {number} [initialTime]
   * @returns {void}
   */
  metric(name, initialTime) {
    const { metrics, startTime } = this;

    if (!initialTime) {
      initialTime = startTime;
    }

    metrics.metric(name, Date.now() - initialTime);
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
 * @returns {Promise<string|null>} a warning to log once boot completes
 */
async function initDatabase({ config }) {
  const DatabaseStateManager = require('./server/data/db/database-state-manager');
  const dbStateManager = new DatabaseStateManager({
    knexMigratorFilePath: config.get('paths:appRoot'),
  });
  await dbStateManager.makeReady();

  const databaseInfo = require('./server/data/db/info');
  await databaseInfo.init();

  return dbStateManager.warning;
}

/**
 * Checks that need config and nothing else, run before anything is started.
 * @param {object} options
 * @param {object} options.config
 */
async function initFoundationChecks({ config }) {
  debug('Begin: initFoundationChecks');

  // Validate configured adapters up-front so misconfiguration fails at boot
  // rather than on first lazy use (e.g. first image upload or scheduled job)
  debug('Begin: adapters');
  const adapterManager = require('./server/services/adapter-manager').default;
  adapterManager.init();
  debug('End: adapters');

  // Limit image processing to the configured image formats before anything
  // can process an image
  debug('Begin: image upload config');
  const { restrictImageDecoders } = require('./server/lib/image/image-decoders');
  const {
    IMAGE_UPLOAD_TYPES,
    getIgnoredImageContentTypes,
  } = require('./server/lib/image/image-content');
  const uploads = config.get('uploads');
  restrictImageDecoders(IMAGE_UPLOAD_TYPES.flatMap((type) => uploads[type]?.extensions ?? []));

  // Image uploads can only be stored as image types, so point out any
  // configured types that will be ignored
  for (const type of IMAGE_UPLOAD_TYPES) {
    const ignored = getIgnoredImageContentTypes(uploads[type]?.contentTypes ?? []);
    if (ignored.length > 0) {
      require('@tryghost/logging').warn(
        `Ignoring uploads.${type}.contentTypes that are not image types: ${ignored.join(', ')}`,
      );
    }
  }
  debug('End: image upload config');

  debug('End: initFoundationChecks');
}

/**
 * The shared step's legacy entries. The shared list in bootstrap/shared.ts
 * starts each in order, with the standard roots (signing keys, internal keys)
 * between them. One function per entry, so the list is the order.
 */

/** URL Utils is a bit slow, so it loads on its own and its timing is visible. */
function initUrlUtils() {
  debug('Begin: Load urlUtils');
  require('./shared/url-utils');
  debug('End: Load urlUtils');
}

/** Limits start before settings, so that limits are available for calculated settings. */
async function initLimits() {
  debug('Begin: limits');
  const limits = require('./server/services/limits');
  await limits.init();
  debug('End: limits');
}

/**
 * Settings store key-value pairs used in critical pathways as well as public data like the site title.
 * @param {object} options
 * @param {object} options.config
 */
async function initSettings({ config }) {
  debug('Begin: settings');
  const settings = require('./server/services/settings/settings-service');
  await settings.init();
  await settings.syncEmailSettings(config.get('hostSettings:emailVerification:verified'));
  debug('End: settings');
}

/** Reads the locale setting, so it follows settings. */
async function initI18n() {
  debug('Begin: i18n');
  const i18n = require('./shared/i18n');
  await i18n.init({ events: require('./server/lib/common/events') });
  debug('End: i18n');
}

/**
 * Mail has no start of its own, but no mailer can send until the address
 * policy it asks for the sender exists. It reads settings when it is asked.
 */
function initEmailAddressPolicy() {
  debug('Begin: email address policy');
  const emailAddressService = require('./server/services/email-address');
  emailAddressService.init();
  debug('End: email address policy');
}

/**
 * Member metafields: knex-backed, wired once the DB is ready. A legacy root with
 * a synchronous init, so the services list cannot start it yet.
 */
function initMembersMetafields() {
  debug('Begin: Member Metafields Service');
  const memberMetafieldsService = require('./server/services/members-metafields');
  memberMetafieldsService.init();
  debug('End: Member Metafields Service');
}

/**
 * Stops the job runner when the server shuts down.
 * @param {object} options
 * @param {object} options.ghostServer
 * @param {object} options.config
 */
function initJobsCleanup({ ghostServer, config }) {
  if (ghostServer) {
    // Jobs Service allows parts of Ghost to run in the background
    debug('Begin: Jobs Service');
    const jobsService = require('./server/services/jobs-service');

    ghostServer.registerCleanupTask(async () => {
      await jobsService.shutdown({ timeoutMs: config.get('server:shutdownTimeout') });
    }, 'Jobs Service (in-memory)');
    debug('End: Jobs Service');
  }
}

/**
 * The legacy routing services the frontend reads. The services list starts
 * link redirection and custom theme settings between this and initThemes.
 */
async function initRoutingServices() {
  debug('Begin: initRoutingServices');

  debug('Begin: Routing Settings');
  const routeSettings = require('./server/services/route-settings');
  await routeSettings.init();
  debug('End: Routing Settings');

  debug('Begin: Redirects');
  const customRedirects = require('./server/services/custom-redirects');
  await customRedirects.init();
  debug('End: Redirects');

  debug('End: initRoutingServices');
}

/**
 * Themes and offers. Custom theme settings must be initialized before any theme
 * activation occurs: the services list starts it before this.
 * @param {object} options
 * @param {BootLogger} options.bootLogger
 */
async function initThemes({ bootLogger }) {
  debug('Begin: Themes');
  const themeService = require('./server/services/themes');
  const themeServiceStart = Date.now();
  await themeService.init();
  bootLogger.metric('theme-service-init', themeServiceStart);
  debug('End: Themes');

  debug('Begin: Offers');
  const offers = require('./server/services/offers');
  await offers.init();
  debug('End: Offers');
}

/**
 * Frontend is intended to be just Ghost's frontend
 */
function initFrontend() {
  debug('Begin: initFrontend');

  const helperService = require('./frontend/services/helpers');
  helperService.init();

  debug('End: initFrontend');
}

/**
 * At the moment we load our express apps all in one go, they require themselves and are co-located
 * What we want is to be able to optionally load various components and mount them
 * So eventually this function should go away
 * @param {Object} options
 * @param {boolean} options.backend
 * @param {boolean} options.frontend
 * @param {Object} options.config
 */
async function initExpressApps({ frontend, backend, config }) {
  debug('Begin: initExpressApps');

  const parentApp = require('./server/web/parent/app')();
  const vhost = require('@tryghost/mw-vhost');

  // Mount the express apps on the parentApp
  if (backend) {
    // ADMIN + API
    const backendApp = require('./server/web/parent/backend')();
    parentApp.use(vhost(config.getBackendMountPath(), backendApp));
  }

  if (frontend) {
    // SITE + MEMBERS
    const urlService = require('./server/services/url');
    const frontendApp = require('./server/web/parent/frontend')({ urlService });
    parentApp.use(vhost(config.getFrontendMountPath(), frontendApp));
  }

  debug('End: initExpressApps');
  return parentApp;
}

/**
 * Initialize prometheus client
 */
function initPrometheusClient({ config }) {
  if (config.get('prometheus:enabled')) {
    debug('Begin: initPrometheusClient');
    const prometheusClient = require('./shared/prometheus-client');
    debug('End: initPrometheusClient');
    return prometheusClient;
  }
  return null;
}

/**
 * Dynamic routing is generated from the routes.yaml file
 * When Ghost's DB and core are loaded, we can access this file and call routing.routingManager.start
 * However this _must_ happen after the express Apps are loaded, hence why this is here and not in initFrontend
 * Routing is currently tightly coupled between the frontend and backend
 *
 * Runs on every boot, not just a frontend one: it both mounts routers on the
 * site app and tells the URL service about them, and only the first needs a
 * frontend. The APIs, the email service and webhooks all build URLs, so a
 * backend-only boot that skipped this resolved every resource to /404/.
 */
async function initDynamicRouting({ frontend }) {
  debug('Begin: Dynamic Routing');
  const routing = require('./frontend/services/routing');
  const routeSettingsModule = require('./server/services/route-settings');
  const urlService = require('./server/services/url');
  const bridge = require('./bridge');
  bridge.init();

  // With a frontend, initFrontend has already called this to build the site
  // app's router. Without one there is nothing to mount, but the URL service
  // still has to be handed to RouterManager before the routers register — so
  // call the same init and discard the express router it returns.
  if (!frontend) {
    routing.routerManager.init({ urlService });
  }

  await routeSettingsModule.service.start({
    routerManager: routing.routerManager,
    urlService,
  });

  debug('End: Dynamic Routing');
}

/**
 * The app service cannot be loaded unless the frontend is enabled
 * In future, the logic to determine whether this should be loaded should be in the service loader
 */
async function initAppService() {
  debug('Begin: App Service');
  const appService = require('./frontend/services/apps');
  await appService.init();
  debug('End: App Service');
}

/**
 * The legacy services the standard services read while they start: the email
 * address policy, the scheduler, Stripe and gifts. Each takes something boot
 * makes, or has no init() the services list can call.
 * @param {object} options
 * @param {object} options.ghostServer
 * @returns {Promise<{schedulerAdapter: object}>}
 */
async function initLegacyServicesFirst({ ghostServer }) {
  debug('Begin: initLegacyServicesFirst');

  const stripe = require('./server/services/stripe');
  // Built when it is loaded, from the internal keys that are ready by now.
  require('./server/services/post-scheduling');
  const giftService = require('./server/services/gifts');
  const adapterManager = require('./server/services/adapter-manager').default;
  const { withErrorCapture } = require('./server/adapters/scheduling/error-capture');

  const assert = require('node:assert/strict');
  const urlUtils = require('./shared/url-utils').default;
  const internalKeys = require('./server/services/internal-keys').default.service;
  const { checkouts } = require('./server/services/stripe-checkout-config').default.service;

  // Initialize things that other services depend on first.
  const apiUrl = urlUtils.urlFor('api', { type: 'admin' }, true);
  const schedulerAdapter = withErrorCapture(adapterManager.getAdapter('scheduling'));
  schedulerAdapter.run();
  await stripe.init();
  giftService.init({
    apiUrl,
    schedulerAdapter,
    internalKeys,
    checkouts,
  });
  assert(giftService.deliveryService, 'Gift delivery service should be initialized');
  if (ghostServer) {
    ghostServer.registerCleanupTask(async () => {
      await stripe.shutdown();
    }, 'Stripe');
  }

  debug('End: initLegacyServicesFirst');

  // The same adapter instance is registered with automations after the job runner starts.
  return { schedulerAdapter };
}

/**
 * The legacy services that start together. The services list starts member
 * attribution, audience feedback, newsletters and mentions before this, and
 * every other standard service after it.
 */
async function initLegacyServices({ ghostServer, config, prometheusClient, jobsService }) {
  debug('Begin: initLegacyServices');

  const identityTokens = require('./server/services/identity-tokens');
  const members = require('./server/services/members');
  const webhooks = require('./server/services/webhooks');
  const membersEvents = require('./server/services/members-events');
  const linkTracking = require('./server/services/link-tracking');
  const emailSuppressionList = require('./server/services/email-suppression-list');
  const emailService = require('./server/services/email-service');
  const emailAnalytics = require('./server/services/email-analytics');
  const contentImport = require('./server/services/content-import');
  const giftService = require('./server/services/gifts');
  const machinePaymentsService = require('./server/services/machine-payments');
  const domainEvents = require('@tryghost/domain-events');
  const automationsApi = require('./server/services/automations/automations-api');

  const metrics = require('@tryghost/metrics');
  const db = require('./server/data/db');
  const models = require('./server/models');
  const settingsCache = require('./shared/settings-cache');
  const giftDeliveryService = giftService.deliveryService;

  await Promise.all([
    identityTokens.init(),
    members.init(),
    membersEvents.init(),
    emailService.init({ ghostServer, jobsService }),
    emailAnalytics.init({
      automationsApi,
      config,
      db,
      domainEvents,
      emailSuppressionList,
      giftDeliveryService,
      membersRepository: members.api.members,
      models,
      metrics,
      prometheusClient,
      settingsCache,
    }),
    webhooks.listen(),
    linkTracking.init(),
    emailSuppressionList.init(),
    contentImport.init(),
    machinePaymentsService.init(),
  ]);

  debug('End: initLegacyServices');
}

/**
 * Hands the job runner every handler, then starts it. Handlers must be
 * registered before the runner starts.
 * @param {object} options
 * @param {object} options.jobsService
 */
async function initJobs({ jobsService }) {
  const assert = require('node:assert/strict');
  const giftService = require('./server/services/gifts');
  const emailService = require('./server/services/email-service');
  const emailAnalytics = require('./server/services/email-analytics');
  const mentionsService = require('./server/services/mentions').default;
  const mediaInliner = require('./server/services/media-inliner').default;
  const contentImport = require('./server/services/content-import');

  debug('Begin: Register job handlers');
  const registerJobHandlers =
    require('./server/services/jobs-service/register-job-handlers').default;
  const memberJobs = require('./server/services/members/jobs');
  const membersService = require('./server/services/members');
  const tinybirdSync = require('./server/services/tinybird-sync');
  const updateCheck = require('./server/services/update-check');
  const signingKeys = require('./server/services/signing-keys').default;
  memberJobs.init();
  const siteImporter = require('./server/data/importer').init({ jobsService });
  assert(giftService.service, 'Gift service should be initialized');
  assert(mentionsService.service.controller, 'Mentions controller should be initialized');
  assert(mentionsService.service.sendingService, 'Mentions sending service should be initialized');
  assert(membersService.handleImportJob, 'Members service should be initialized');
  assert(emailService.service, 'Email service should be initialized');
  registerJobHandlers({
    gifts: emailAnalytics.getGifts(),
    automationAnalytics: emailAnalytics.getAutomations(),
    newsletters: emailAnalytics.getNewsletters(),
    jobsService,
    memberJobs,
    giftService: giftService.service,
    mediaInliner: mediaInliner.service,
    mentionsController: mentionsService.service.controller,
    mentionsSendingService: mentionsService.service.sendingService,
    membersService,
    emailService: emailService.service,
    siteImporter,
    tinybirdSync,
    contentImport,
    updateCheck,
    signingKeys: signingKeys.service,
    authCleanup: require('./server/auth/better-auth/cleanup'),
  });
  await jobsService.start();
  debug('End: Register job handlers');
}

/**
 * What must follow the job runner's start and still blocks boot: automation
 * polling sends through the runner, and posts are rescheduled last.
 * @param {object} options
 * @param {object} options.schedulerAdapter the adapter initServices started
 */
async function initAfterJobs({ schedulerAdapter }) {
  const { automationsService } = require('./server/services/automations');
  const postScheduling = require('./server/services/post-scheduling').default;
  const domainEvents = require('@tryghost/domain-events');
  const urlUtils = require('./shared/url-utils').default;
  const settingsCache = require('./shared/settings-cache');
  const internalKeys = require('./server/services/internal-keys').default.service;
  const apiUrl = urlUtils.urlFor('api', { type: 'admin' }, true);

  automationsService.init({
    domainEvents,
    apiUrl,
    schedulerAdapter,
    internalKeys,
    siteUuid: settingsCache.get('site_uuid'),
  });

  if (schedulerAdapter.rescheduleOnBoot) {
    await postScheduling.rescheduleAll();
  }
}

/**
 * Kick off recurring jobs and background services
 * These are things that happen on boot, but we don't need to wait for them to finish
 * Later, this might be a service hook

 * @param {object} options
 * @param {object} options.config
 */
async function initBackgroundServices({ config }) {
  debug('Begin: initBackgroundServices');

  // Load all inactive themes
  const themeService = require('./server/services/themes');
  themeService.loadInactiveThemes();

  // we don't want to kick off background services that will interfere with tests
  if (process.env.NODE_ENV.startsWith('test')) {
    return;
  }

  // Resume any newsletter sends interrupted by a prior container shutdown.
  // Runs before activitypub.init so an activitypub failure can't disable recovery.
  try {
    const emailService = require('./server/services/email-service');
    await emailService.service.resumeInterruptedSends();
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  // Retry gift deliveries interrupted by a prior shutdown. Not awaited: recovery
  // sends sequentially and must not hold up the remaining background services.
  const giftService = require('./server/services/gifts');
  giftService.recoverPendingDeliveries();

  const jobsService = require('./server/services/jobs-service').getInstance();

  // Runs before activitypub.init for the same reason as the send recovery
  // above: gifts would otherwise go uncleaned for the life of the process
  // if an unrelated background service fails.
  try {
    const giftJobs = require('./server/services/gifts/jobs');
    await giftJobs.scheduleGiftCleanupJob(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  // Runs before activitypub.init for the same reason as the gift cleanup
  // above: reminders would otherwise go unsent for the life of the process
  // if an unrelated background service fails.
  try {
    const giftJobs = require('./server/services/gifts/jobs');
    await giftJobs.scheduleGiftReminderJob(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  // Runs before activitypub.init for the same reason as the gift cleanup
  // above: tokens and expired comped subscriptions would otherwise go
  // uncleaned for the life of the process if an unrelated background
  // service fails.
  try {
    const memberJobs = require('./server/services/members/jobs');
    await memberJobs.scheduleTokenCleanupJob(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  try {
    const memberJobs = require('./server/services/members/jobs');
    await memberJobs.scheduleExpiredCompCleanupJob(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  try {
    const signingKeys = require('./server/services/signing-keys').default;
    await signingKeys.extras.scheduleCheckJob(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  try {
    const authCleanup = require('./server/auth/better-auth/cleanup');
    await authCleanup.scheduleClearExpiredJob(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  // Load email analytics recurring jobs. Runs before activitypub.init for the
  // same reason as the schedules above. Each failure is logged rather than
  // thrown so one failed registration cannot hide a sibling's or stop the
  // remaining background services from starting.
  if (config.get('backgroundJobs:emailAnalytics')) {
    const emailAnalyticsJobs = require('./server/services/email-analytics/jobs');
    const results = await Promise.allSettled([
      emailAnalyticsJobs.scheduleRecurringNewslettersJob(),
      emailAnalyticsJobs.scheduleRecurringAutomationsJob(),
      emailAnalyticsJobs.scheduleRecurringGiftDeliveriesJob(),
    ]);
    const logging = require('@tryghost/logging');
    for (const result of results) {
      if (result.status === 'rejected') {
        logging.error(result.reason);
      }
    }
  }

  const activitypub = require('./server/services/activitypub');
  await activitypub.init();

  try {
    const tinybirdSync = require('./server/services/tinybird-sync');
    await tinybirdSync.scheduleJob(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  try {
    const updateCheck = require('./server/services/update-check');
    await updateCheck.scheduleJobs(jobsService);
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }

  // Remote feature-flag overrides (config-gated; inert unless explicitly configured).
  const remoteFlags = require('./server/services/remote-flags');
  remoteFlags.init(config);

  const milestonesService = require('./server/services/milestones');
  milestonesService.initAndRun();

  debug('End: initBackgroundServices');
}

/**
 * Logs unhandled rejections instead of leaving them to the process default.
 * @param {object} options
 * @param {Pick<import('@tryghost/logging').GhostLogger, 'error' | 'warn'>} options.logging
 */
function initUnhandledRejections({ logging }) {
  debug('Begin: Add unhandled rejection handler');
  process.on('unhandledRejection', (error) => {
    logging.error('Unhandled rejection:', error);
  });
  debug('End: Add unhandled rejection handler');
}

/**
 * Sentry must be initialized early, but requires config
 */
function initSentry() {
  debug('Begin: Load sentry');
  require('./shared/sentry');
  debug('End: Load sentry');
}

/**
 * Start the server with a minimal app in global maintenance mode
 * @param {object} options
 * @param {boolean} options.server
 * @param {object} options.config
 * @param {BootLogger} options.bootLogger
 * @param {object} [options.prometheusClient]
 * @param {() => Promise<void>} options.stopApplication stops what the application started
 * @returns {Promise<{rootApp: object, ghostServer?: object}>}
 */
async function initHttpServer({ server, config, bootLogger, prometheusClient, stopApplication }) {
  debug('Begin: load server + minimal app');
  const rootApp = require('./app')();

  if (!server) {
    return { rootApp };
  }

  const { GhostServer } = require('./server/ghost-server');
  const ghostServer = new GhostServer({
    url: config.getSiteUrl(),
    env: config.get('env'),
    serverConfig: config.get('server'),
  });
  await ghostServer.start(rootApp);
  bootLogger.log('server started');

  // Ensure the prometheus client is stopped when the server shuts down
  ghostServer.registerCleanupTask(async () => {
    if (prometheusClient) {
      prometheusClient.stop();
    }
  }, 'Prometheus client');

  // The server still owns signals, draining and the exit. The application
  // stops what its own steps started as one of the server's cleanup tasks.
  ghostServer.registerCleanupTask(stopApplication, 'Application');
  debug('End: load server + minimal app');

  return { rootApp, ghostServer };
}

/**
 * Get the DB ready, and say so
 * @param {object} options
 * @param {object} options.config
 * @param {BootLogger} options.bootLogger
 * @returns {Promise<string|null>} a warning to log once boot completes
 */
async function initDatabaseReady({ config, bootLogger }) {
  debug('Begin: Get DB ready');
  const databaseWarning = await initDatabase({ config });
  bootLogger.log('database ready');
  return databaseWarning;
}

/**
 * Traces queries on the connection for Sentry
 */
function initQueryTracing() {
  const connection = require('./server/data/db/connection');
  require('./shared/sentry').initQueryTracing(connection);
  debug('End: Get DB ready');

  debug('Begin: Load Ghost Services & Apps');
}

/**
 * Instrument the knex instance and connection pool if prometheus is enabled
 * Needs to be after initLegacyCore because the pool is destroyed and recreated before then, which removes the event listeners
 * @param {object} options
 * @param {object} [options.prometheusClient]
 */
function initKnexInstrumentation({ prometheusClient }) {
  if (prometheusClient) {
    prometheusClient.instrumentKnex(require('./server/data/db/connection'));
  }
}

/**
 * Builds the job runner. It starts in initJobs, once every handler is registered.
 * @param {object} options
 * @param {object} options.config
 */
function initJobsService({ config }) {
  const knex = require('./server/data/db').knex;
  return require('./server/services/jobs-service').init({ knex, config });
}

/**
 * Mount the full Ghost app onto the minimal root app, disable maintenance mode and let everyone know
 * @param {object} options
 * @param {object} options.config
 * @param {Pick<import('@tryghost/logging').GhostLogger, 'error' | 'warn'>} options.logging
 * @param {BootLogger} options.bootLogger
 * @param {object} options.rootApp
 * @param {object} options.ghostApp
 * @param {string|null} options.databaseWarning
 */
function initReady({ config, logging, bootLogger, rootApp, ghostApp, databaseWarning }) {
  debug('End: Load Ghost Services & Apps');

  debug('Begin: mountGhost');
  rootApp.disable('maintenance');
  rootApp.use(config.getSubdir(), ghostApp);
  debug('End: mountGhost');

  // We are technically done here - let everyone know!
  bootLogger.log('booted');
  // After boot, so the dev console's boot output doesn't scroll it away
  if (databaseWarning) {
    logging.warn(databaseWarning);
  }
  bootLogger.metric('boot-time');
  notifyServerReady();
}

/**
 * ----------------------------------
 * Boot Ghost - The magic starts here
 * ----------------------------------
 *
 * The start sequence belongs to the framework: `application.start()` runs the
 * steps listed in `ghost/bootstrap/app.ts`, and each step calls one of the
 * functions above. This function builds the foundation, starts the
 * application, and handles a failed start.
 *
 * @returns {Promise<object>} ghostServer
 */
async function bootGhost({ backend = true, frontend = true, server = true } = {}) {
  // Metrics
  const startTime = Date.now();
  debug('Begin Boot');

  // We need access to these variables in both the try and catch block
  let application;
  let flushLogsAndMetrics;
  let logging;
  // What the steps of this boot hand to each other. See ghost/bootstrap/transition/legacy-steps.ts
  const state = {};

  // These require their own try-catch block and error format, because we can't log an error if logging isn't working
  try {
    // Step 0 - Build the foundation - fundamental required components
    // Version is required by logging, sentry & Migration config & so is fundamental to booting
    // However, it involves reading package.json so its slow & it's here for visibility on that slowness
    debug('Begin: Load version info');
    require('@tryghost/version');
    debug('End: Load version info');

    // The foundation is built first, in one place: config, then the logger,
    // then the database handle and the event bus. Everything else is handed
    // these or reaches them through the legacy paths, which return the same
    // instances. Building the database handle opens no connection.
    debug('Begin: Build foundation');
    application = require('../bootstrap/app').default;
    logging = application.startFoundation().logging;
    debug('End: Build foundation');

    // Metrics and the log flush still load their own way
    debug('Begin: Load metrics');
    const metrics = require('@tryghost/metrics');
    flushLogsAndMetrics = require('./shared/flush').flushLogsAndMetrics;
    state.bootLogger = new BootLogger(logging, metrics, startTime);
    debug('End: Load metrics');

    // At this point logging is required, so we can handle errors better
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
    process.exit(1);
  }

  try {
    await application.start({ backend, frontend, server }, state);

    // If we pass the env var, kill Ghost
    if (process.env.GHOST_CI_SHUTDOWN_AFTER_BOOT) {
      await flushLogsAndMetrics();
      process.exit(0);
    }

    // We return the server purely for testing purposes
    if (server) {
      debug('End Boot: Returning Ghost Server');
      return state.ghostServer;
    } else {
      debug('End boot: Returning Root App');
      return state.rootApp;
    }
  } catch (error) {
    const errors = require('@tryghost/errors');

    // Ensure the error we have is an ignition error
    let serverStartError = error;
    if (!errors.utils.isGhostError(serverStartError)) {
      serverStartError = new errors.InternalServerError({
        message: serverStartError.message,
        err: serverStartError,
      });
    }

    logging.error(serverStartError);
    // fallback in case logger fails to flush before exit
    console.error(serverStartError); // eslint-disable-line no-console

    // If ghost was started and something else went wrong, we shut it down
    if (state.ghostServer) {
      notifyServerReady(serverStartError);
      state.ghostServer.shutdown(2);
    } else {
      // Ghost server failed to start, drain the log transports before exiting
      await flushLogsAndMetrics();
      process.exit(2);
    }
  }
}

module.exports = bootGhost;
// The steps of the start sequence. ghost/bootstrap/app.ts lists each one once.
Object.assign(module.exports, {
  initUnhandledRejections,
  initSentry,
  initPrometheusClient,
  initHttpServer,
  initDatabaseReady,
  initQueryTracing,
  initFoundationChecks,
  initUrlUtils,
  initLimits,
  initSettings,
  initI18n,
  initEmailAddressPolicy,
  initMembersMetafields,
  initJobsCleanup,
  initKnexInstrumentation,
  initRoutingServices,
  initThemes,
  initFrontend,
  initExpressApps,
  initDynamicRouting,
  initAppService,
  initJobsService,
  initLegacyServicesFirst,
  initLegacyServices,
  initJobs,
  initAfterJobs,
  initReady,
  initBackgroundServices,
});
