import type { Clock } from './clock';
import type { Config } from './config';
import type { Database } from './database';
import type { EventBus } from './events';
import type { Logger } from './logging';

/**
 * The instances every application has, built once per process before anything
 * else starts. They are handed out, never imported.
 *
 * @see [Foundation types](../README.md#foundation-types)
 */
export interface Foundation<AppConfig extends Config = Config> {
  readonly config: AppConfig;
  readonly logging: Logger;
  /** Undefined when the application configures no database. */
  readonly database: Database | undefined;
  readonly events: EventBus;
  readonly clock: Clock;
}
