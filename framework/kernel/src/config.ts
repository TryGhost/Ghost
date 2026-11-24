/**
 * What code is handed when it reads config. A type only: importing it loads
 * no config.
 *
 * This is the call Ghost's code makes today, so it returns `any` as that call
 * does.
 */
export interface Config {
  get(key: string): any;
}
