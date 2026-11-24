/**
 * What code is handed when it logs. A type only: importing it builds nothing.
 *
 * These are the calls Ghost's code makes today. Whoever builds the logger
 * (the foundry, for an application's bootstrap) can hand over one that does more.
 */
export interface Logger {
  debug(...messages: unknown[]): void;
  info(...messages: unknown[]): void;
  warn(...messages: unknown[]): void;
  error(...messages: unknown[]): void;
}
