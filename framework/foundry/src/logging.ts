import type { Logger } from '@tryghost/kernel/logging';
// A CommonJS library, so its default export is the whole module. This entry
// point of the library builds nothing when it is imported.
import library from '@tryghost/logging/factory.js';

/** What a logger is built from. The application's bootstrap supplies it. */
export type LoggerOptions = library.GhostLoggerOptions;

/**
 * Builds a logger from the options it is given. It reads no file and no
 * config, and it keeps nothing: the caller holds what it built.
 *
 * `@tryghost/logging` is used here as any third-party library would be. What
 * it builds is a kernel `Logger`, and the library's own logger besides.
 */
export function createLogger(options: LoggerOptions): library.GhostLogger {
  return new library.GhostLogger(options) satisfies Logger;
}
