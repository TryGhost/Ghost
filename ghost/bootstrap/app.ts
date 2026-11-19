import { createApplication } from '@tryghost/foundry/application';
import { createDatabase } from '@tryghost/foundry/database';
import { createLogger } from '@tryghost/foundry/logging';
import { loadNconf } from '../core/shared/config/loader';
import type { GhostConfig } from '../core/shared/config/validated';
import { loggingOptions } from './logging-options';
import { legacyEventBus } from './transition/legacy-events';
import { shareLoggerWithLegacy } from './transition/legacy-logging';

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
const application = createApplication<GhostConfig>({
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
});

export default application;
