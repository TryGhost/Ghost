import type { Run } from '@tryghost/foundry/application';
import type { GhostConfig } from '../../core/shared/config/validated';

/** What `bootGhost` is called with: which parts of Ghost this process runs. */
export interface BootOptions {
  readonly backend: boolean;
  readonly frontend: boolean;
  readonly server: boolean;
}

/**
 * What the legacy steps of one boot hand to each other. Each value is set by
 * the step that makes it and read by later ones; nothing else reads it.
 */
export interface BootState {
  /** Set by `bootGhost` before the application starts. */
  bootLogger?: unknown;
  prometheusClient?: unknown;
  rootApp?: unknown;
  /** Absent when Ghost boots without an HTTP server. */
  ghostServer?: unknown;
  databaseWarning?: string | null;
  ghostApp?: unknown;
  jobsService?: unknown;
  schedulerAdapter?: unknown;
}

export type BootRun = Run<GhostConfig, BootOptions, BootState>;

// The steps core/boot.js exports. It is JavaScript, so they are untyped here.
type LegacyBoot = Record<
  | 'initUnhandledRejections'
  | 'initSentry'
  | 'initPrometheusClient'
  | 'initHttpServer'
  | 'initDatabaseReady'
  | 'initQueryTracing'
  | 'initFoundationChecks'
  | 'initUrlUtils'
  | 'initSettings'
  | 'initI18n'
  | 'initEmailAddressPolicy'
  | 'initMembersMetafields'
  | 'initJobsCleanup'
  | 'initKnexInstrumentation'
  | 'initRoutingServices'
  | 'initThemes'
  | 'initFrontend'
  | 'initExpressApps'
  | 'initDynamicRouting'
  | 'initAppService'
  | 'initJobsService'
  | 'initLegacyServicesFirst'
  | 'initLegacyServices'
  | 'initJobs'
  | 'initAfterJobs'
  | 'initReady'
  | 'initBackgroundServices',
  (options?: any) => any
>;

// The functions themselves are still in core/boot.js. It is loaded when the
// first step runs, and loads each step's own modules only inside that step,
// so listing the steps loads nothing.
const boot = (): LegacyBoot => require('../../core/boot');

/**
 * The steps of Ghost's start that the framework does not own yet, one function
 * each, in the order `../app.ts` lists them. Each is a wrapper: it takes what
 * the function in `core/boot.js` needs from the run, and keeps what it returns
 * for later steps.
 *
 * Transitional. A step leaves this file when it becomes a shared module or a
 * service the framework starts from a list.
 */
export const legacySteps = {
  unhandledRejections: ({ foundation }: BootRun) =>
    boot().initUnhandledRejections({ logging: foundation.logging }),

  errorReporting: () => boot().initSentry(),

  metrics: ({ foundation, state }: BootRun) => {
    state.prometheusClient = boot().initPrometheusClient({ config: foundation.config });
  },

  httpServer: async (
    { options, foundation, state }: BootRun,
    stopApplication: () => Promise<void>,
  ) => {
    const { rootApp, ghostServer } = await boot().initHttpServer({
      server: options.server,
      config: foundation.config,
      bootLogger: state.bootLogger,
      prometheusClient: state.prometheusClient,
      stopApplication,
    });
    state.rootApp = rootApp;
    state.ghostServer = ghostServer;
  },

  database: async ({ foundation, state }: BootRun) => {
    state.databaseWarning = await boot().initDatabaseReady({
      config: foundation.config,
      bootLogger: state.bootLogger,
    });
  },

  queryTracing: () => boot().initQueryTracing(),

  foundationChecks: ({ foundation }: BootRun) =>
    boot().initFoundationChecks({ config: foundation.config }),

  urlUtils: () => boot().initUrlUtils(),

  settings: ({ foundation }: BootRun) => boot().initSettings({ config: foundation.config }),

  i18n: () => boot().initI18n(),

  emailAddressPolicy: () => boot().initEmailAddressPolicy(),

  membersMetafields: () => boot().initMembersMetafields(),

  jobsCleanup: ({ foundation, state }: BootRun) =>
    boot().initJobsCleanup({ ghostServer: state.ghostServer, config: foundation.config }),

  knexInstrumentation: ({ state }: BootRun) =>
    boot().initKnexInstrumentation({ prometheusClient: state.prometheusClient }),

  routingServices: () => boot().initRoutingServices(),

  themes: ({ state }: BootRun) => boot().initThemes({ bootLogger: state.bootLogger }),

  frontend: () => boot().initFrontend(),

  expressApps: async ({ options, foundation, state }: BootRun) => {
    state.ghostApp = await boot().initExpressApps({
      frontend: options.frontend,
      backend: options.backend,
      config: foundation.config,
    });
  },

  dynamicRouting: ({ options }: BootRun) =>
    boot().initDynamicRouting({ frontend: options.frontend }),

  appService: () => boot().initAppService(),

  jobsService: ({ foundation, state }: BootRun) => {
    state.jobsService = boot().initJobsService({ config: foundation.config });
  },

  legacyServicesFirst: async ({ state }: BootRun) => {
    const { schedulerAdapter } = await boot().initLegacyServicesFirst({
      ghostServer: state.ghostServer,
    });
    state.schedulerAdapter = schedulerAdapter;
  },

  legacyServices: ({ foundation, state }: BootRun) =>
    boot().initLegacyServices({
      ghostServer: state.ghostServer,
      config: foundation.config,
      prometheusClient: state.prometheusClient,
      jobsService: state.jobsService,
    }),

  jobs: ({ state }: BootRun) => boot().initJobs({ jobsService: state.jobsService }),

  afterJobs: ({ state }: BootRun) =>
    boot().initAfterJobs({ schedulerAdapter: state.schedulerAdapter }),

  ready: ({ foundation, state }: BootRun) =>
    boot().initReady({
      config: foundation.config,
      logging: foundation.logging,
      bootLogger: state.bootLogger,
      rootApp: state.rootApp,
      ghostApp: state.ghostApp,
      databaseWarning: state.databaseWarning,
    }),

  backgroundServices: ({ foundation }: BootRun) =>
    boot().initBackgroundServices({ config: foundation.config }),
};
