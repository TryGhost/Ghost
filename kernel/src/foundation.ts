import type { Config } from './config';
import type { Database } from './database';
import type { EventBus } from './events';
import type { Logger } from './logging';

/**
 * The instances every application has, built once per process before anything
 * else starts. A domain's `boot.ts` receives this; a domain without one hands
 * it to its service roots unchanged. Nothing imports the instances.
 *
 * @see [Foundation types](./README.md#foundation-types)
 */
export interface Foundation<AppConfig extends Config = Config> {
  readonly config: AppConfig;
  readonly logging: Logger;
  /** Undefined when the application configures no database. */
  readonly database: Database | undefined;
  readonly events: EventBus;
}
