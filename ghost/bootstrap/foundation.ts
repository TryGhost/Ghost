import type { Foundation, Logger } from '#kernel/foundation';
import { createFoundation } from '#foundry/foundation';
import { legacyConfig, legacyDatabase } from './transition/legacy-foundation';
import { legacyEventBus } from './transition/legacy-events';
import { loggingValues } from './values/logging';

const debug: (message: string) => void = require('@tryghost/debug')('boot:foundation');

/** The logger Ghost builds: what the framework calls, and what Ghost's own code calls besides. */
type GhostLogger = InstanceType<typeof import('@tryghost/logging/factory').GhostLogger>;
type GhostMetrics = InstanceType<typeof import('@tryghost/metrics/factory').GhostMetrics>;

/**
 * Ghost's logger, built from Ghost's values and registered as the one `require('@tryghost/logging')`
 * returns, so that code handed the foundation and code that imports the package write to the same
 * logger. If something loaded the package before the start, as tests do, that logger is the one.
 */
function logger({ config }: Pick<Foundation, 'config'>): Logger & GhostLogger {
  const { isMainThread }: typeof import('node:worker_threads') = require('node:worker_threads');
  const {
    GhostLogger,
    getInstance,
    setInstance,
  }: typeof import('@tryghost/logging/factory') = require('@tryghost/logging/factory');
  const existing = getInstance();
  if (existing) {
    debug('Logger: using the one loaded before the start');
    return existing;
  }
  debug("Logger: building from Ghost's values");
  const values = loggingValues(config);
  if (!isMainThread) {
    // A worker thread writes nothing itself: it hands each line to the thread that started it.
    values.transports = ['parent'];
  }
  return setInstance(new GhostLogger(values));
}

/**
 * Ghost's metrics, built and registered as the logger is. Not part of the foundation: only what
 * times the start, and legacy code that imports the package, use it.
 */
export function buildMetrics({ config }: Pick<Foundation, 'config'>): GhostMetrics {
  const {
    GhostMetrics,
    getInstance,
    setInstance,
  }: typeof import('@tryghost/metrics/factory') = require('@tryghost/metrics/factory');
  return getInstance() ?? setInstance(new GhostMetrics(loggingValues(config)));
}

/**
 * Ghost's foundation. Declaring it builds nothing: each part is built when it is first read.
 * The start reads config and the logger before anything else.
 */
export const foundation = createFoundation({
  config: legacyConfig,
  logger,
  database: legacyDatabase,
  events: legacyEventBus,
});
