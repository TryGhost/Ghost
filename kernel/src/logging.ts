import type { GhostLogger } from '@tryghost/logging';

/**
 * What code is handed when it logs. A type only: importing this builds no
 * logger. Ask for the methods you use with `Pick<Logger, 'info' | 'error'>`.
 *
 * @see [Foundation types](./README.md#foundation-types)
 */
export type Logger = Pick<
  GhostLogger,
  'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'child'
>;

/** The options a logger is built from. The application's bootstrap supplies them. */
export type LoggerOptions = import('@tryghost/logging').GhostLoggerOptions;
