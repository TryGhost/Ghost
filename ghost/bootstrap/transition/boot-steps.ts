// The steps of Ghost's start that the framework does not own yet
// ---------------------------------------------------------------
// One function for each legacy step that `../app.ts`, `../shared.ts` and
// `../services.ts` list, reached through `./legacy-steps.ts`. They were the
// phases of `core/boot.js` and are unchanged apart from their types.
//
// Transitional. A step leaves this file when it becomes a shared module or a
// service the framework starts from a list.
//
// IMPORTANT:
// ----------
// Nothing is required at the top of this file except debug. Every module is
// required inside the step that uses it, so that the HTTP server is listening
// in maintenance mode before anything heavy is loaded, and so that
// DEBUG=ghost:boot* shows where the time goes.
import type { Logger } from '@tryghost/kernel/logging';
import type { GhostConfig } from '../../core/shared/config/validated';

const debug: (message: string) => void = require('@tryghost/debug')('boot');

type Config = GhostConfig;

/** Logs how long boot has taken so far. Made by `bootGhost`. */
export interface BootLogger {
  log(message: string): void;
  metric(name: string, initialTime?: number): void;
}

// What these steps use of the objects boot makes and hands between them. The
// classes are not imported: their types reach most of Ghost, and this folder
// is also compiled by packages with stricter settings.
export interface Server {
  registerCleanupTask(task: () => unknown, name: string): void;
  shutdown(code: number): unknown;
}
export interface ExpressApp {
  use(path: unknown, app: unknown): unknown;
  disable(setting: string): unknown;
}
export interface PrometheusClient {
  stop(): void;
  instrumentKnex(knex: unknown): void;
}
export interface JobsService {
  start(): Promise<void>;
}
export interface SchedulerAdapter {
  run(): void;
  rescheduleOnBoot?: boolean;
}

/**
 * Get the Database into a ready state
 * - DatabaseStateManager handles doing all this for us
 *
 */
async function initDatabase({ config }: { config: Config }): Promise<string | null> {
  const DatabaseStateManager = require('../../core/server/data/db/database-state-manager');
  const dbStateManager = new DatabaseStateManager({
    knexMigratorFilePath: config.get('paths:appRoot'),
  });
  await dbStateManager.makeReady();

  const databaseInfo = require('../../core/server/data/db/info');
  await databaseInfo.init();

  return dbStateManager.warning;
}

/**
 * Checks that need config and nothing else, run before anything is started.
 */
export async function initFoundationChecks({ config }: { config: Config }): Promise<void> {
  debug('Begin: initFoundationChecks');

  // Limit image processing to the configured image formats before anything
  // can process an image
  debug('Begin: image upload config');
  const { applyImageUploadConfig } = require('../../core/server/lib/image/image-upload-config');
  applyImageUploadConfig(config.get('uploads'));
  debug('End: image upload config');

  debug('End: initFoundationChecks');
}

/**
 * The shared step's legacy entries. The shared list in bootstrap/shared.ts
 * starts each in order, with the standard roots (signing keys, internal keys)
 * between them. One function per entry, so the list is the order.
 */

/** URL Utils is a bit slow, so it loads on its own and its timing is visible. */
export function initUrlUtils(): void {
  debug('Begin: Load urlUtils');
  require('../../core/shared/url-utils');
  debug('End: Load urlUtils');
}

/** Reads the locale setting, so it follows settings. */
export async function initI18n(): Promise<void> {
  debug('Begin: i18n');
  const i18n = require('../../core/shared/i18n');
  await i18n.init({ events: require('../../core/server/lib/common/events') });
  debug('End: i18n');
}

/**
 * Mail has no start of its own, but no mailer can send until the address
 * policy it asks for the sender exists. It reads settings when it is asked.
 */
export function initEmailAddressPolicy(): void {
  debug('Begin: email address policy');
  const emailAddressService = require('../../core/server/services/email-address');
  emailAddressService.init();
  debug('End: email address policy');
}

/**
 * Member metafields: knex-backed, wired once the DB is ready. A legacy root with
 * a synchronous init, so the services list cannot start it yet.
 */
export function initMembersMetafields(): void {
  debug('Begin: Member Metafields Service');
  const memberMetafieldsService = require('../../core/server/services/members-metafields');
  memberMetafieldsService.init();
  debug('End: Member Metafields Service');
}

/**
 * Stops the job runner when the server shuts down.
 */
export function initJobsCleanup({
  ghostServer,
  config,
}: {
  ghostServer?: Server;
  config: Config;
}): void {
  if (ghostServer) {
    // Jobs Service allows parts of Ghost to run in the background
    debug('Begin: Jobs Service');
    const jobsService = require('../../core/server/services/jobs-service');

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
export async function initRoutingServices(): Promise<void> {
  debug('Begin: initRoutingServices');

  debug('Begin: Routing Settings');
  const routeSettings = require('../../core/server/services/route-settings');
  await routeSettings.init();
  debug('End: Routing Settings');

  debug('Begin: Redirects');
  const customRedirects = require('../../core/server/services/custom-redirects');
  await customRedirects.init();
  debug('End: Redirects');

  debug('End: initRoutingServices');
}

/**
 * Themes and offers. Custom theme settings must be initialized before any theme
 * activation occurs: the services list starts it before this.
 */
export async function initThemes({ bootLogger }: { bootLogger: BootLogger }): Promise<void> {
  debug('Begin: Themes');
  const themeService = require('../../core/server/services/themes');
  const themeServiceStart = Date.now();
  await themeService.init();
  bootLogger.metric('theme-service-init', themeServiceStart);
  debug('End: Themes');

  debug('Begin: Offers');
  const offers = require('../../core/server/services/offers');
  await offers.init();
  debug('End: Offers');
}

/**
 * Frontend is intended to be just Ghost's frontend
 */
export function initFrontend(): void {
  debug('Begin: initFrontend');

  const helperService = require('../../core/frontend/services/helpers');
  helperService.init();

  debug('End: initFrontend');
}

/**
 * At the moment we load our express apps all in one go, they require themselves and are co-located
 * What we want is to be able to optionally load various components and mount them
 * So eventually this function should go away
 */
export async function initExpressApps({
  frontend,
  backend,
  config,
}: {
  frontend: boolean;
  backend: boolean;
  config: Config;
}): Promise<ExpressApp> {
  debug('Begin: initExpressApps');

  const parentApp = require('../../core/server/web/parent/app')();
  const vhost = require('@tryghost/mw-vhost');

  // Mount the express apps on the parentApp
  if (backend) {
    // ADMIN + API
    const backendApp = require('../../core/server/web/parent/backend')();
    parentApp.use(vhost(config.getBackendMountPath(), backendApp));
  }

  if (frontend) {
    // SITE + MEMBERS
    const urlService = require('../../core/server/services/url');
    const frontendApp = require('../../core/server/web/parent/frontend')({ urlService });
    parentApp.use(vhost(config.getFrontendMountPath(), frontendApp));
  }

  debug('End: initExpressApps');
  return parentApp;
}

/**
 * Initialize prometheus client
 */
export function initPrometheusClient({ config }: { config: Config }): PrometheusClient | null {
  if (config.get('prometheus:enabled')) {
    debug('Begin: initPrometheusClient');
    const prometheusClient = require('../../core/shared/prometheus-client');
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
export async function initDynamicRouting({ frontend }: { frontend: boolean }): Promise<void> {
  debug('Begin: Dynamic Routing');
  const routing = require('../../core/frontend/services/routing');
  const routeSettingsModule = require('../../core/server/services/route-settings');
  const urlService = require('../../core/server/services/url');
  const bridge = require('../../core/bridge');
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
export async function initAppService(): Promise<void> {
  debug('Begin: App Service');
  const appService = require('../../core/frontend/services/apps');
  await appService.init();
  debug('End: App Service');
}

/**
 * The legacy services the standard services read while they start: the email
 * address policy, the scheduler, Stripe and gifts. Each takes something boot
 * makes, or has no init() the services list can call.
 */
export async function initLegacyServicesFirst({
  ghostServer,
}: {
  ghostServer?: Server;
}): Promise<{ schedulerAdapter: SchedulerAdapter }> {
  debug('Begin: initLegacyServicesFirst');

  const stripe = require('../../core/server/services/stripe');
  // Built when it is loaded, from the internal keys that are ready by now.
  require('../../core/server/services/post-scheduling');
  const giftService = require('../../core/server/services/gifts');
  const adapterManager = require('../../core/server/services/adapter-manager').default;
  const { withErrorCapture } = require('../../core/server/adapters/scheduling/error-capture');

  const assert = require('node:assert/strict');
  const urlUtils = require('../../core/shared/url-utils').default;
  const internalKeys = require('../../core/server/services/internal-keys').default.service;
  const { checkouts } = require('../../core/server/services/stripe-checkout-config').default
    .service;

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
export async function initLegacyServices({
  ghostServer,
  config,
  prometheusClient,
  jobsService,
}: {
  ghostServer?: Server;
  config: Config;
  prometheusClient?: PrometheusClient | null;
  jobsService: JobsService;
}): Promise<void> {
  debug('Begin: initLegacyServices');

  const identityTokens = require('../../core/server/services/identity-tokens');
  const members = require('../../core/server/services/members');
  const webhooks = require('../../core/server/services/webhooks');
  const membersEvents = require('../../core/server/services/members-events');
  const linkTracking = require('../../core/server/services/link-tracking');
  const emailSuppressionList = require('../../core/server/services/email-suppression-list');
  const emailService = require('../../core/server/services/email-service');
  const emailAnalytics = require('../../core/server/services/email-analytics');
  const contentImport = require('../../core/server/services/content-import');
  const giftService = require('../../core/server/services/gifts');
  const machinePaymentsService = require('../../core/server/services/machine-payments');
  const domainEvents = require('@tryghost/domain-events');
  const automationsApi = require('../../core/server/services/automations/automations-api');

  const metrics = require('@tryghost/metrics');
  const db = require('../../core/server/data/db');
  const models = require('../../core/server/models');
  const settingsCache = require('../../core/shared/settings-cache');
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
 */
export async function initJobs({ jobsService }: { jobsService: JobsService }): Promise<void> {
  const assert = require('node:assert/strict');
  const giftService = require('../../core/server/services/gifts');
  const emailService = require('../../core/server/services/email-service');
  const emailAnalytics = require('../../core/server/services/email-analytics');
  const mentionsService = require('../../core/server/services/mentions').default;
  const mediaInliner = require('../../core/server/services/media-inliner').default;
  const contentImport = require('../../core/server/services/content-import');

  debug('Begin: Register job handlers');
  const registerJobHandlers =
    require('../../core/server/services/jobs-service/register-job-handlers').default;
  const memberJobs = require('../../core/server/services/members/jobs');
  const membersService = require('../../core/server/services/members');
  const tinybirdSync = require('../../core/server/services/tinybird-sync');
  const updateCheck = require('../../core/server/services/update-check');
  const signingKeys = require('../../core/server/services/signing-keys').default;
  memberJobs.init();
  const siteImporter = require('../../core/server/data/importer').init({ jobsService });
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
    authCleanup: require('../../core/server/auth/better-auth/cleanup'),
  });
  await jobsService.start();
  debug('End: Register job handlers');
}

/**
 * What must follow the job runner's start and still blocks boot: automation
 * polling sends through the runner, and posts are rescheduled last.
 */
export async function initAfterJobs({
  schedulerAdapter,
}: {
  schedulerAdapter: SchedulerAdapter;
}): Promise<void> {
  const { automationsService } = require('../../core/server/services/automations');
  const postScheduling = require('../../core/server/services/post-scheduling').default;
  const domainEvents = require('@tryghost/domain-events');
  const urlUtils = require('../../core/shared/url-utils').default;
  const settingsCache = require('../../core/shared/settings-cache');
  const internalKeys = require('../../core/server/services/internal-keys').default.service;
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
 * Logs unhandled rejections instead of leaving them to the process default.
 */
export function initUnhandledRejections({ logging }: { logging: Pick<Logger, 'error'> }): void {
  debug('Begin: Add unhandled rejection handler');
  process.on('unhandledRejection', (error) => {
    logging.error('Unhandled rejection:', error);
  });
  debug('End: Add unhandled rejection handler');
}

/**
 * Sentry must be initialized early, but requires config
 */
export function initSentry(): void {
  debug('Begin: Load sentry');
  require('../../core/shared/sentry');
  debug('End: Load sentry');
}

/**
 * Start the server with a minimal app in global maintenance mode
 */
export async function initHttpServer({
  server,
  config,
  bootLogger,
  prometheusClient,
  stopApplication,
}: {
  server: boolean;
  config: Config;
  bootLogger: BootLogger;
  prometheusClient?: PrometheusClient | null;
  stopApplication: () => Promise<void>;
}): Promise<{ rootApp: ExpressApp; ghostServer?: Server }> {
  debug('Begin: load server + minimal app');
  const rootApp = require('../../core/app')();

  if (!server) {
    return { rootApp };
  }

  const { GhostServer } = require('../../core/server/ghost-server');
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
 */
export async function initDatabaseReady({
  config,
  bootLogger,
}: {
  config: Config;
  bootLogger: BootLogger;
}): Promise<string | null> {
  debug('Begin: Get DB ready');
  const databaseWarning = await initDatabase({ config });
  bootLogger.log('database ready');
  return databaseWarning;
}

/**
 * Traces queries on the connection for Sentry
 */
export function initQueryTracing(): void {
  const connection = require('../../core/server/data/db/connection');
  require('../../core/shared/sentry').initQueryTracing(connection);
  debug('End: Get DB ready');

  debug('Begin: Load Ghost Services & Apps');
}

/**
 * Instrument the knex instance and connection pool if prometheus is enabled
 * Needs to be after initLegacyCore because the pool is destroyed and recreated before then, which removes the event listeners
 */
export function initKnexInstrumentation({
  prometheusClient,
}: {
  prometheusClient?: PrometheusClient | null;
}): void {
  if (prometheusClient) {
    prometheusClient.instrumentKnex(require('../../core/server/data/db/connection'));
  }
}

/**
 * Builds the job runner. It starts in initJobs, once every handler is registered.
 */
export function initJobsService({ config }: { config: Config }): JobsService {
  const knex = require('../../core/server/data/db').knex;
  return require('../../core/server/services/jobs-service').init({ knex, config });
}

/**
 * Mount the full Ghost app onto the minimal root app, disable maintenance mode and let everyone know
 */
export function initReady({
  config,
  logging,
  bootLogger,
  rootApp,
  ghostApp,
  databaseWarning,
}: {
  config: Config;
  logging: Pick<Logger, 'warn'>;
  bootLogger: BootLogger;
  rootApp: ExpressApp;
  ghostApp: ExpressApp;
  databaseWarning?: string | null;
}): void {
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
  debug('Notifying server ready (success)');
  require('../../core/server/notify').notifyServerReady();
}
