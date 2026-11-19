import { createApplication, type Application } from '@tryghost/foundry/application';
import { createDatabase } from '@tryghost/foundry/database';
import { createLogger } from '@tryghost/foundry/logging';
import { loadNconf } from '../core/shared/config/loader';
import type { GhostConfig } from '../core/shared/config/validated';
import { loggingOptions } from './logging-options';
import { legacyEventBus } from './transition/legacy-events';
import { shareLoggerWithLegacy } from './transition/legacy-logging';
import { legacySteps, type BootOptions, type BootState } from './transition/legacy-steps';

/**
 * Ghost, as an application of the framework: where its config is, and how its
 * logger and database are configured. The framework decides the order these
 * are built in and builds each once.
 *
 * This module holds the application object, and so every foundation instance.
 * It is the only one that does. Boot builds the foundation from it first; the
 * modules that used to build these themselves (`shared/config`,
 * `server/data/db/connection`) now return what this holds, so code that
 * imports them and code that is handed the foundation share one instance.
 *
 * Importing this file builds nothing. Reading `application.foundation.config`
 * loads config; reading `.logging` or `.database` builds those.
 */
const application: Application<GhostConfig, BootOptions, BootState> = createApplication({
  name: 'Ghost',

  // Transitional: Ghost's own loader. Only where config is belongs here; the
  // loading and validating machinery is framework code that has not moved yet.
  config: () => loadNconf(),

  logging: (config) => shareLoggerWithLegacy(() => createLogger(loggingOptions(config))),

  database: ({ config, logging }) => {
    const database = config.get('database') as
      | import('../core/server/data/db/configure-knex').DatabaseConfig
      | undefined;
    if (!database?.client) {
      return undefined;
    }
    // Loaded here, not at the top, so that a process that only reads config
    // (the logging options file, a script) does not load Knex.
    const {
      configure,
    }: typeof import('../core/server/data/db/configure-knex') = require('../core/server/data/db/configure-knex');
    return createDatabase(configure(database, { env: config.get('env'), logging }));
  },

  // The published event bus is one static emitter. See ./transition/legacy-events.ts.
  events: () => legacyEventBus(),

  // What goes in each step of the start sequence. The framework owns the order
  // of the steps and runs every entry without knowing what it is. An entry
  // names what it runs without loading it.
  //
  // Every entry is a legacy step today: a function of core/boot.js, reached
  // through ./transition/legacy-steps.ts. The two `modules` lists are empty
  // until shared modules and services are started from a list.
  steps: {
    foundation: {
      after: [
        { name: 'unhandled rejections', run: legacySteps.unhandledRejections },
        { name: 'error reporting', run: legacySteps.errorReporting },
        { name: 'metrics', run: legacySteps.metrics },
        // Listening, in maintenance mode, before anything heavy is loaded.
        {
          name: 'http server',
          run: (run) => legacySteps.httpServer(run, () => application.stop()),
        },
      ],
    },
    database: {
      run: legacySteps.database,
      after: [{ name: 'query tracing', run: legacySteps.queryTracing }],
    },
    shared: {
      before: [{ name: 'foundation checks', run: legacySteps.foundationChecks }],
      modules: [],
      after: [{ name: 'legacy shared', run: legacySteps.shared }],
    },
    services: {
      before: [
        { name: 'legacy core', run: legacySteps.legacyCore },
        { name: 'knex instrumentation', run: legacySteps.knexInstrumentation },
        { name: 'services for frontend', run: legacySteps.servicesForFrontend },
        { name: 'frontend', when: ({ options }) => options.frontend, run: legacySteps.frontend },
        { name: 'express apps', run: legacySteps.expressApps },
        { name: 'dynamic routing', run: legacySteps.dynamicRouting },
        {
          name: 'app service',
          when: ({ options }) => options.frontend,
          run: legacySteps.appService,
        },
        { name: 'jobs service', run: legacySteps.jobsService },
        { name: 'legacy services', run: legacySteps.services },
      ],
      modules: [],
    },
    jobs: {
      run: legacySteps.jobs,
      after: [{ name: 'after jobs', run: legacySteps.afterJobs }],
    },
    ready: {
      run: legacySteps.ready,
    },
    background: [{ name: 'background services', run: legacySteps.backgroundServices }],
  },
});

export default application;
