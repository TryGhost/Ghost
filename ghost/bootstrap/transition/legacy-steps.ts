import assert from 'node:assert/strict';
import type { Run } from '@tryghost/foundry/application';
import type { GhostConfig } from '../../core/shared/config/validated';
import type {
  BootLogger,
  ExpressApp,
  JobsService,
  PrometheusClient,
  SchedulerAdapter,
  Server,
} from './boot-steps';

/** What `bootGhost` is called with: which parts of Ghost this process runs. */
export interface BootOptions {
  readonly backend: boolean;
  readonly frontend: boolean;
  readonly server: boolean;
  /**
   * Whether this process does the work of the worker role: what runs on its
   * own, with no request behind it. Every Ghost process does today. A service
   * `start` that is worker-role work is listed with `when: worker`.
   */
  readonly worker: boolean;
}

/**
 * What the legacy steps of one boot hand to each other. Each value is set by
 * the step that makes it and read by later ones; nothing else reads it.
 */
export interface BootState {
  /** Set by `bootGhost` before the application starts. */
  bootLogger?: BootLogger;
  /** Null when Prometheus is not enabled. */
  prometheusClient?: PrometheusClient | null;
  rootApp?: ExpressApp;
  /** Absent when Ghost boots without an HTTP server. */
  ghostServer?: Server;
  databaseWarning?: string | null;
  ghostApp?: ExpressApp;
  jobsService?: JobsService;
  schedulerAdapter?: SchedulerAdapter;
  /** Set by the background list when it decides whether this start is under test. */
  backgroundOutsideTests?: boolean;
}

export type BootRun = Run<GhostConfig, BootOptions, BootState>;

// Loaded when the first step runs. It loads each step's own modules only
// inside that step, so listing the steps loads nothing.
const boot = (): typeof import('./boot-steps') => require('./boot-steps');

// What an earlier step of the same start made. The order in `../app.ts`
// guarantees it; this says so when a start is assembled in another order.
function made<Value>(value: Value | undefined, name: keyof BootState): Value {
  assert.ok(value !== undefined, `No earlier step made ${name}`);
  return value;
}

/**
 * The steps of Ghost's start that the framework does not own yet, one function
 * each, in the order `../app.ts` lists them. Each is a wrapper: it takes what
 * the function in `./boot-steps.ts` needs from the run, and keeps what it returns
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
      bootLogger: made(state.bootLogger, 'bootLogger'),
      prometheusClient: state.prometheusClient,
      stopApplication,
    });
    state.rootApp = rootApp;
    state.ghostServer = ghostServer;
  },

  database: async ({ foundation, state }: BootRun) => {
    state.databaseWarning = await boot().initDatabaseReady({
      config: foundation.config,
      bootLogger: made(state.bootLogger, 'bootLogger'),
    });
  },

  queryTracing: () => boot().initQueryTracing(),

  foundationChecks: ({ foundation }: BootRun) =>
    boot().initFoundationChecks({ config: foundation.config }),

  urlUtils: () => boot().initUrlUtils(),

  i18n: () => boot().initI18n(),

  emailAddressPolicy: () => boot().initEmailAddressPolicy(),

  membersMetafields: () => boot().initMembersMetafields(),

  jobsCleanup: ({ foundation, state }: BootRun) =>
    boot().initJobsCleanup({ ghostServer: state.ghostServer, config: foundation.config }),

  knexInstrumentation: ({ state }: BootRun) =>
    boot().initKnexInstrumentation({ prometheusClient: state.prometheusClient }),

  routingServices: () => boot().initRoutingServices(),

  themes: ({ state }: BootRun) =>
    boot().initThemes({ bootLogger: made(state.bootLogger, 'bootLogger') }),

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
      jobsService: made(state.jobsService, 'jobsService'),
    }),

  jobs: ({ state }: BootRun) =>
    boot().initJobs({ jobsService: made(state.jobsService, 'jobsService') }),

  afterJobs: ({ state }: BootRun) =>
    boot().initAfterJobs({ schedulerAdapter: made(state.schedulerAdapter, 'schedulerAdapter') }),

  ready: ({ foundation, state }: BootRun) =>
    boot().initReady({
      config: foundation.config,
      logging: foundation.logging,
      bootLogger: made(state.bootLogger, 'bootLogger'),
      rootApp: made(state.rootApp, 'rootApp'),
      ghostApp: made(state.ghostApp, 'ghostApp'),
      databaseWarning: state.databaseWarning,
    }),
};
