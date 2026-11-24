import type { Config } from './config.ts';
import type { Database } from './database.ts';
import type { Logger } from './logging.ts';

/**
 * What an application runs on. Its bootstrap assembles one and hands it to the
 * code that needs it, so that code imports none of the three for itself.
 */
export interface Foundation {
  config: Config;
  logging: Logger;
  database: Database;
}
