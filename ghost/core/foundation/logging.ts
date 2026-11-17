import type { Logger, LoggerOptions } from '../kernel/logging';

// The class alone. The package's entry point would build a logger of its own.
const GhostLogger: typeof import('@tryghost/logging').GhostLogger = require('@tryghost/logging/lib/GhostLogger');

/**
 * Builds a logger from the options an application supplies. Nothing is read
 * here: no options file, no config, no environment.
 *
 * Call it once per process, from the application's bootstrap. Two loggers
 * given the same rotating file corrupt it.
 *
 * The class is required from inside `@tryghost/logging` because the package's
 * entry point builds its own logger from `loggingrc` as soon as it is loaded.
 */
export function createLogger(options: LoggerOptions): Logger {
  return new GhostLogger(options);
}
