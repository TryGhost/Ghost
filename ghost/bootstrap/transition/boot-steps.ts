// The phases of Ghost's start that are not yet shaped as the framework wants
// -----------------------------------------------------------------------
// EARMARKED. These were phases of `core/boot.js`, moved here unchanged apart from their types.
// `./steps.ts` names each as an entry of the list Ghost's application runs, and says what
// removes it. The phases that were only a sequence of starts are entries of that list now.
//
// IMPORTANT:
// ----------
// Nothing is required at the top of this file except debug. Every module is required inside the
// phase that uses it, so that the HTTP server is listening in maintenance mode before anything
// heavy is loaded, and so that DEBUG=ghost:boot* shows where the time goes.
// Ghost's config, with the helpers its loader adds.
type Config = typeof import('../../core/shared/config');

const debug: (message: string) => void = require('@tryghost/debug')('boot');

/** Logs how long boot has taken so far. */
export interface BootLogger {
  log(message: string): void;
  metric(name: string, initialTime?: number): void;
}

// What these phases use of the objects boot makes and hands between them.
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

/**
 * Helper function to handle sending server ready notifications
 */
export function notifyServerReady(error?: unknown): void {
  const notify = require('../../core/server/notify');

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
 */
export async function initDatabase({ config }: { config: Config }): Promise<string | null> {
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
 * Services are components that make up part of Ghost and need initializing on boot
 * These services should all be part of core, frontend services should be loaded with the frontend
 * We are working towards this being a service loader, with the ability to make certain services optional
 */
export async function initServices({
  ghostServer,
  config,
  prometheusClient,
  jobsService,
}: {
  ghostServer?: Server;
  config: Config;
  prometheusClient: PrometheusClient | null;
  jobsService: JobsService;
}): Promise<void> {
  debug('Begin: initServices');

  debug('Begin: Services');
  const identityTokens = require('../../core/server/services/identity-tokens');
  const stripe = require('../../core/server/services/stripe');
  const members = require('../../core/server/services/members');
  const webhooks = require('../../core/server/services/webhooks');
  const postScheduling = require('../../core/server/services/post-scheduling').default;
  const membersEvents = require('../../core/server/services/members-events');
  const linkTracking = require('../../core/server/services/link-tracking');
  const emailSuppressionList = require('../../core/server/services/email-suppression-list');
  const emailService = require('../../core/server/services/email-service');
  const emailAnalytics = require('../../core/server/services/email-analytics');
  const mentionsService = require('../../core/server/services/mentions').default;
  const mediaInliner = require('../../core/server/services/media-inliner').default;
  const contentImport = require('../../core/server/services/content-import');
  const giftService = require('../../core/server/services/gifts');
  const machinePaymentsService = require('../../core/server/services/machine-payments');
  const emailAddressService = require('../../core/server/services/email-address');
  const domainEvents = require('@tryghost/domain-events');
  const { automationsService } = require('../../core/server/services/automations');
  const automationsApi = require('../../core/server/services/automations/automations-api');
  const adapterManager = require('../../core/server/services/adapter-manager').default;
  const { withErrorCapture } = require('../../core/server/adapters/scheduling/error-capture');

  const assert = require('node:assert/strict');
  const metrics = require('@tryghost/metrics');
  const db = require('../../core/server/data/db');
  const models = require('../../core/server/models');
  const urlUtils = require('../../core/shared/url-utils').default;
  const settingsCache = require('../../core/shared/settings-cache');
  const internalKeys = require('../../core/server/services/internal-keys').default.service;
  const { checkouts } = require('../../core/server/services/stripe-checkout-config').default
    .service;

  // Initialize things that other services depend on first.
  emailAddressService.init();
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
  const giftDeliveryService = giftService.deliveryService;
  assert(giftDeliveryService, 'Gift delivery service should be initialized');
  if (ghostServer) {
    ghostServer.registerCleanupTask(async () => {
      await stripe.shutdown();
    }, 'Stripe');
  }

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

  debug('End: Services');

  debug('End: initServices');
}

/**
 * Runs one background startup step, logging its failure instead of throwing, so that a step
 * which fails cannot stop the steps after it.
 */
async function runIsolated(step: () => unknown): Promise<void> {
  try {
    await step();
  } catch (err) {
    const logging = require('@tryghost/logging');
    logging.error(err);
  }
}

/**
 * Kick off recurring jobs and background services
 * These are things that happen on boot, but we don't need to wait for them to finish
 * Later, this might be a service hook

 */
export async function initBackgroundServices({ config }: { config: Config }): Promise<void> {
  debug('Begin: initBackgroundServices');

  // Load all inactive themes
  const themeService = require('../../core/server/services/themes');
  themeService.loadInactiveThemes();

  // we don't want to kick off background services that will interfere with tests
  if (process.env.NODE_ENV?.startsWith('test')) {
    return;
  }

  // Resume any newsletter sends interrupted by a prior container shutdown.
  // Runs before activitypub.init so an activitypub failure can't disable recovery.
  await runIsolated(() =>
    require('../../core/server/services/email-service').service.resumeInterruptedSends(),
  );

  // Retry gift deliveries interrupted by a prior shutdown. Not awaited: recovery
  // sends sequentially and must not hold up the remaining background services.
  const giftService = require('../../core/server/services/gifts');
  giftService.recoverPendingDeliveries();

  const jobsService = require('../../core/server/services/jobs-service').getInstance();

  // These run before activitypub.init for the same reason as the send recovery above: gifts,
  // reminders, tokens, expired comped subscriptions, signing keys, expired auth rows and email
  // analytics would otherwise go unhandled for the life of the process if an unrelated background
  // service fails.
  // Each is scheduled in turn and isolated from the others.
  const jobsBeforeActivityPub = [
    () => require('../../core/server/services/gifts/jobs').scheduleGiftCleanupJob(jobsService),
    () => require('../../core/server/services/gifts/jobs').scheduleGiftReminderJob(jobsService),
    () => require('../../core/server/services/members/jobs').scheduleTokenCleanupJob(jobsService),
    () =>
      require('../../core/server/services/members/jobs').scheduleExpiredCompCleanupJob(jobsService),
    () =>
      require('../../core/server/services/signing-keys').default.extras.scheduleCheckJob(
        jobsService,
      ),
    () =>
      require('../../core/server/auth/better-auth/cleanup').scheduleClearExpiredJob(jobsService),
    () => require('../../core/server/services/email-analytics/jobs').scheduleRecurringJobs(),
  ];
  for (const scheduleJob of jobsBeforeActivityPub) {
    await runIsolated(scheduleJob);
  }

  // Isolated like the jobs around it: a failed start is logged and the work below still starts.
  await runIsolated(() => require('../../core/server/services/activitypub').init());

  const jobsAfterActivityPub = [
    () => require('../../core/server/services/tinybird-sync').scheduleJob(jobsService),
    () => require('../../core/server/services/update-check').scheduleJobs(jobsService),
  ];
  for (const scheduleJob of jobsAfterActivityPub) {
    await runIsolated(scheduleJob);
  }

  // Remote feature-flag overrides (config-gated; inert unless explicitly configured).
  const remoteFlags = require('../../core/server/services/remote-flags');
  remoteFlags.init(config);

  const milestonesService = require('../../core/server/services/milestones');
  milestonesService.initAndRun();

  debug('End: initBackgroundServices');
}
