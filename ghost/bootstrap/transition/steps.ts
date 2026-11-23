// The entries of Ghost's start
// ---------------------------
// Every thing Ghost does when it starts, as one named entry each. `../start.ts` puts them in
// order; the foundry runs that list and knows nothing about any entry.
//
// An entry is `framework` when a Ghost that is stateless, runs as several processes for a site
// and serves several sites in a process would still do it before serving. Everything else is
// `earmarked`: needed for now, and it says what removes it.
//
// All of them are in this folder because what they call is legacy code in `ghost/core`. A
// framework entry leaves this file, not Ghost: it becomes a declaration of the module it starts.
//
// IMPORTANT: nothing is required at the top of this file except types. An entry requires what it
// uses when it runs, so that the HTTP server is listening in maintenance mode before anything
// heavy is loaded.
import type { Run, Step } from '#foundry/application';
import type { BootLogger, ExpressApp, JobsService, PrometheusClient, Server } from './boot-steps';

/** Which parts of Ghost this process runs. */
export interface StartOptions {
  readonly backend: boolean;
  readonly frontend: boolean;
  readonly server: boolean;
  /**
   * The long-running work this process takes on. `web` serves requests. `worker` does the work
   * no request asks for. A process has both unless it is told otherwise.
   */
  readonly roles: readonly Role[];
}

export type Role = 'web' | 'worker';

/**
 * What the entries of one start hand to each other. Each value is set by the entry that makes it
 * and read by later ones.
 *
 * EARMARKED as a whole: entries hand each other objects because they are one process starting
 * one site in one order. It leaves with the entries that read it.
 */
export interface StartState {
  readonly options: StartOptions;
  readonly bootLogger: BootLogger;
  prometheusClient?: PrometheusClient | null;
  rootApp?: ExpressApp;
  /** Absent when Ghost starts without an HTTP server. */
  ghostServer?: Server;
  databaseWarning?: string | null;
  ghostApp?: ExpressApp;
  jobsService?: JobsService;
}

export interface Entry extends Step<StartState> {
  readonly kind: 'framework' | 'earmarked';
  /** For an earmarked entry: what removes it. For a framework entry: what it becomes. */
  readonly leavesWhen: string;
  /** Run only by a process with this role. An entry without one always runs. */
  readonly role?: Role;
}

type StartRun = Run<StartState>;

const debug: (message: string) => void = require('@tryghost/debug')('boot');
const phases = (): typeof import('./boot-steps') => require('./boot-steps');
const core = (path: string) => require(`../../core/${path}`);

// What an earlier entry of the same start made. The order in `../start.ts` guarantees it; this
// says so when a start is put together in another order.
function made<Value>(value: Value | undefined, name: keyof StartState): Value {
  if (value === undefined) {
    const { IncorrectUsageError } = require('@tryghost/errors');
    throw new IncorrectUsageError({ message: `No earlier entry of the start made ${name}.` });
  }
  return value;
}

// Ghost's config, with the helpers its loader adds. The foundation's config is the same object.
const ghostConfig = (run: StartRun) =>
  run.foundation.config as typeof import('../../core/shared/config');

/**
 * Wraps an entry so that a failure is logged and the start carries on. For work that Ghost can
 * serve without.
 */
async function isolated(run: StartRun, work: () => unknown): Promise<void> {
  try {
    await work();
  } catch (error) {
    run.foundation.logger.error(error);
  }
}

export const entries = {
  // ---- With the foundation: what has to exist before anything else runs ----

  unhandledRejections: {
    name: 'unhandled rejections',
    kind: 'earmarked',
    leavesWhen: 'the foundry owns what a process does with a failure nothing handled',
    run({ foundation }) {
      process.on('unhandledRejection', (error) => {
        foundation.logger.error('Unhandled rejection:', error);
      });
    },
  },

  errorReporting: {
    name: 'error reporting',
    kind: 'earmarked',
    leavesWhen:
      'error reporting is part of the foundation, built from values Ghost supplies; today Sentry sets itself up when its module is loaded',
    run() {
      core('shared/sentry');
    },
  },

  metrics: {
    name: 'metrics',
    kind: 'earmarked',
    leavesWhen:
      'the metrics client is part of the foundation and decides for itself whether it is enabled',
    run(run) {
      run.state.prometheusClient = phases().initPrometheusClient({ config: ghostConfig(run) });
    },
  },

  httpServer: {
    name: 'HTTP server, in maintenance mode',
    kind: 'earmarked',
    leavesWhen:
      'listening is what the web role does when it starts serving, and a site that is not ready answers for itself; today one process listens early so that a migration can run behind a maintenance page',
    async run(run) {
      const { state } = run;
      const config = ghostConfig(run);
      state.rootApp = core('app')();
      if (!state.options.server) {
        return;
      }
      const { GhostServer } = core('server/ghost-server');
      const ghostServer: Server & { start(app: unknown): Promise<void> } = new GhostServer({
        url: config.getSiteUrl(),
        env: config.get('env'),
        serverConfig: config.get('server'),
      });
      state.ghostServer = ghostServer;
      await ghostServer.start(state.rootApp);
      state.bootLogger.log('server started');

      // Ensure the prometheus client is stopped when the server shuts down
      ghostServer.registerCleanupTask(async () => {
        state.prometheusClient?.stop();
      }, 'Prometheus client');
      // The server decides when Ghost stops: stopping it stops the application, which stops what
      // the entries started and forgets every service.
      ghostServer.registerCleanupTask(() => run.stop(), 'Application');
    },
  },

  // ---- Register: everything declares itself; nothing is built or used ----

  registerServices: {
    name: 'register the service roots that listen',
    kind: 'framework',
    leavesWhen:
      'it stays; the list becomes whatever collects declarations, so that settings, flags and listeners are declared one way',
    run({ services }) {
      const { listening }: typeof import('../services') = require('../services');
      // The application listens for the events these roots declare. None is built until it is
      // used or one of its events arrives.
      for (const named of listening) {
        services.register(named());
      }
    },
  },

  // ---- Boot: only what must run before Ghost serves ----

  database: {
    name: 'database: check the schema state, and migrate',
    kind: 'earmarked',
    leavesWhen:
      'migrations run out of process again; what stays is the check that the schema is the one this code expects, which is a framework entry',
    async run(run) {
      const { state } = run;
      state.databaseWarning = await phases().initDatabase({ config: ghostConfig(run) });
      state.bootLogger.log('database ready');
      core('shared/sentry').initQueryTracing(core('server/data/db/connection'));
    },
  },

  adapters: {
    name: 'adapters: validate what is configured',
    kind: 'earmarked',
    leavesWhen:
      'the foundry validates adapter configuration when it builds the adapter manager from the values Ghost supplies',
    run() {
      // Validate configured adapters up-front so misconfiguration fails at boot
      // rather than on first lazy use (e.g. first image upload or scheduled job)
      core('server/services/adapter-manager').default.init();
    },
  },

  imageUploadConfig: {
    name: 'image upload config',
    kind: 'earmarked',
    leavesWhen: 'image handling reads its config when it first handles an image',
    run(run) {
      // Limit image processing to the configured image formats before anything can process an image
      core('server/lib/image/image-upload-config').applyImageUploadConfig(
        ghostConfig(run).get('uploads'),
      );
    },
  },

  urlUtils: {
    name: 'url utils',
    kind: 'earmarked',
    leavesWhen: 'nothing; it only loads the module here so that its load time shows on its own',
    run() {
      core('shared/url-utils');
    },
  },

  limits: {
    name: 'limits',
    kind: 'earmarked',
    leavesWhen:
      'limits is a shared module built on first use; today it is started before settings because calculated settings read it',
    async run() {
      await core('server/services/limits').init();
    },
  },

  settings: {
    name: 'settings: load',
    kind: 'framework',
    leavesWhen:
      'it stays, as the boot hook the settings module declares; what it loads becomes one site of several',
    async run(run) {
      const settings = core('server/services/settings/settings-service');
      await settings.init();
      await settings.syncEmailSettings(
        ghostConfig(run).get('hostSettings:emailVerification:verified'),
      );
    },
  },

  openServices: {
    name: 'services: allow building',
    kind: 'framework',
    leavesWhen: 'it stays: services are built on first use from here until the application stops',
    run({ services }) {
      // Safe from here: config, the database and settings are ready. A service used earlier is
      // refused.
      services.open();
    },
  },

  signingKeys: {
    name: 'signing keys: advance a due rotation',
    kind: 'earmarked',
    leavesWhen:
      'a rotation is advanced by a job and by whichever process first needs a key, with a lock, so that no process has to do it before it serves',
    async run({ services }) {
      // Signing keys come from settings and must be ready before anything signs or serves a JWKS.
      await services.start(core('server/services/signing-keys').default);
    },
  },

  i18n: {
    name: 'i18n',
    kind: 'earmarked',
    leavesWhen: 'translations are loaded for a locale when it is first rendered',
    async run() {
      await core('shared/i18n').init({ events: core('server/lib/common/events') });
    },
  },

  betterAuth: {
    name: 'Better Auth, under its engine',
    kind: 'earmarked',
    leavesWhen:
      'its readers can wait for it, so that it is built on first use; and the choice of engine is gone',
    async run() {
      // Reads admin_session_secret, so it follows settings. Under legacy nothing loads
      // Better Auth itself.
      const auth = core('server/auth');
      if (auth.isBetterAuth) {
        await auth.betterAuth.start();
      }
    },
  },

  membersMetafields: {
    name: 'members metafields',
    kind: 'earmarked',
    leavesWhen: 'it is a service root, built on first use',
    run() {
      core('server/services/members-metafields').init();
    },
  },

  jobsShutdown: {
    name: 'job runner: shut down with the application',
    kind: 'earmarked',
    leavesWhen: 'the job runner is started by the worker role, which then stops it',
    run(run) {
      // Without a server nothing stops this start, so there is nothing to register with.
      if (!run.state.ghostServer) {
        return;
      }
      const config = ghostConfig(run);
      run.onStop('Jobs Service (in-memory)', () =>
        core('server/services/jobs-service').shutdown({
          timeoutMs: config.get('server:shutdownTimeout'),
        }),
      );
    },
  },

  knexInstrumentation: {
    name: 'metrics: instrument the database',
    kind: 'earmarked',
    leavesWhen:
      'the foundry instruments the database handle it builds; it is here only because the settings start used to replace the connection pool',
    run({ state }) {
      state.prometheusClient?.instrumentKnex(core('server/data/db/connection'));
    },
  },

  routeSettings: {
    name: 'route settings',
    kind: 'earmarked',
    leavesWhen: 'route settings are read by the dynamic routers entry, which is what needs them',
    async run() {
      await core('server/services/route-settings').init();
    },
  },

  customRedirects: {
    name: 'custom redirects',
    kind: 'earmarked',
    leavesWhen:
      'redirects are loaded by the first site request that needs them; they are loaded here because that request cannot wait today',
    async run() {
      await core('server/services/custom-redirects').init();
    },
  },

  themes: {
    name: 'themes: load the active theme',
    kind: 'earmarked',
    leavesWhen:
      'the active theme is loaded by the first site request that renders it; it is loaded here because that request cannot wait today',
    async run({ state }) {
      const themeServiceStart = Date.now();
      await core('server/services/themes').init();
      state.bootLogger.metric('theme-service-init', themeServiceStart);
    },
  },

  offers: {
    name: 'offers',
    kind: 'earmarked',
    leavesWhen: 'offers is a service root, built on first use',
    async run() {
      await core('server/services/offers').init();
    },
  },

  frontendHelpers: {
    name: 'front end helpers',
    kind: 'earmarked',
    leavesWhen: 'theme helpers are registered when the theme engine is first used',
    run({ state }) {
      if (state.options.frontend) {
        phases().initFrontend();
      }
    },
  },

  expressApps: {
    name: 'Express apps',
    kind: 'earmarked',
    leavesWhen: 'the web role builds its apps when it starts serving',
    async run(run) {
      const { state } = run;
      state.ghostApp = await phases().initExpressApps({
        frontend: state.options.frontend,
        backend: state.options.backend,
        config: ghostConfig(run),
      });
    },
  },

  dynamicRouters: {
    name: 'dynamic routers: register',
    kind: 'framework',
    leavesWhen:
      'it stays, as the boot hook the routing module declares: without it every resource resolves to a 404',
    async run({ state }) {
      await phases().initDynamicRouting({ frontend: state.options.frontend });
    },
  },

  appService: {
    name: 'front end apps',
    kind: 'earmarked',
    leavesWhen: 'the internal apps are registered when the front end is first used',
    async run({ state }) {
      if (state.options.frontend) {
        await phases().initAppService();
      }
    },
  },

  jobsService: {
    name: 'job runner: build',
    kind: 'earmarked',
    leavesWhen: 'the job runner is built on first use, like a service',
    run(run) {
      const { knex } = core('server/data/db');
      run.state.jobsService = core('server/services/jobs-service').init({
        knex,
        config: ghostConfig(run),
      });
    },
  },

  legacyServices: {
    name: 'legacy services, job handlers and the job runner',
    kind: 'earmarked',
    leavesWhen:
      'each legacy service is a service root built on first use, job handlers are declared, and the worker role starts the runner; the inventory lists them one by one',
    async run(run) {
      const { state } = run;
      await phases().initServices({
        ghostServer: state.ghostServer,
        config: ghostConfig(run),
        prometheusClient: state.prometheusClient ?? null,
        jobsService: made(state.jobsService, 'jobsService'),
      });
    },
  },

  liftMaintenance: {
    name: 'lift maintenance',
    kind: 'framework',
    leavesWhen: 'it stays: the point at which Ghost serves',
    run(run) {
      const { state } = run;
      const rootApp = made(state.rootApp, 'rootApp');
      rootApp.disable('maintenance');
      rootApp.use(ghostConfig(run).getSubdir(), made(state.ghostApp, 'ghostApp'));
    },
  },

  announceReady: {
    name: 'announce that Ghost is ready',
    kind: 'earmarked',
    leavesWhen: 'the foundry reports a finished start, with how long it took',
    run({ foundation, state }) {
      state.bootLogger.log('booted');
      // After boot, so the dev console's boot output doesn't scroll it away
      if (state.databaseWarning) {
        foundation.logger.warn(state.databaseWarning);
      }
      state.bootLogger.metric('boot-time');
      debug('Notifying server ready (success)');
      phases().notifyServerReady();
    },
  },

  // ---- Serve: the long-running work a role takes on ----

  backgroundServiceStarts: {
    name: 'service roots with background work',
    kind: 'framework',
    role: 'worker',
    leavesWhen: 'it stays: the worker role starts the services that declare a start',
    async run(run) {
      const { background }: typeof import('../services') = require('../services');
      for (const named of background) {
        // Ghost serves without them: one that fails to start is logged and the rest start.
        await isolated(run, () => run.services.start(named()));
      }
    },
  },

  backgroundWork: {
    name: 'background work',
    kind: 'earmarked',
    role: 'worker',
    leavesWhen:
      'each piece is a recurring job or a service start that declares itself; the inventory lists them one by one',
    run(run) {
      // Not awaited: Ghost is serving, and this is work it can serve without.
      void isolated(run, () => phases().initBackgroundServices({ config: ghostConfig(run) }));
    },
  },
} satisfies Record<string, Entry>;
