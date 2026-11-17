import path from 'node:path';
import { createApplication } from '@tryghost/foundry/application';
import { createDatabase } from '@tryghost/foundry/database';
import { createLogger } from '@tryghost/foundry/logging';
import { loadNconf } from '../core/shared/config/loader';
import type { GhostConfig } from '../core/shared/config/validated';
import { legacyEventBus } from './legacy-events';
import { shareLoggerWithLegacy } from './legacy-logging';
import { loggingOptions } from './logging-options';

/** The folder that holds one folder per domain. */
export const domainsRoot = path.resolve(__dirname, '../domains');

/**
 * Ghost, as an application of the framework: where its config values are, how
 * its logger and database are configured, and where its domains live. The
 * framework decides the order these are built in and builds each once.
 *
 * This module holds the application object, and so every foundation instance.
 * It is the only one that does. `boot.js` builds the foundation from it first;
 * the modules that used to build these themselves (`shared/config`,
 * `server/data/db/connection`) now return what this holds, so code that
 * imports them and code that is handed the foundation share one instance.
 *
 * Importing this file builds nothing. Reading `application.foundation.config`
 * loads config; reading `.logging` or `.database` builds those.
 */
const application = createApplication<GhostConfig>({
  name: 'Ghost',

  config: () => loadNconf(),

  logging: (config) => shareLoggerWithLegacy(() => createLogger(loggingOptions(config))),

  database: ({ config, logging }) => {
    const database = config.get('database') as
      | import('../core/server/data/db/configure-knex').DatabaseConfig
      | undefined;
    if (!database?.client) {
      return undefined;
    }
    const {
      configure,
    }: typeof import('../core/server/data/db/configure-knex') = require('../core/server/data/db/configure-knex');
    return createDatabase(configure(database, { env: config.get('env'), logging }));
  },

  // The published event bus is one static emitter. See ./legacy-events.ts.
  events: () => legacyEventBus(),

  domains: {
    root: domainsRoot,
    schedule: (job, foundation) => {
      const {
        scheduleDomainJob,
      }: typeof import('./domains/schedule') = require('./domains/schedule');
      scheduleDomainJob(job, foundation);
    },
  },
});

export default application;
