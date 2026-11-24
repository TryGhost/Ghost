import { createDatabase, type OwnedDatabase } from '#foundry/database';
import type { Logger } from '#kernel/logging';
import { databaseOptions } from './database-options';

type Config = Parameters<typeof databaseOptions>[0];

/**
 * Builds a database handle from Ghost's config: Ghost's options, handed to the
 * framework. Undefined when config names no database client. Connects to nothing
 * until the first query.
 *
 * Whoever calls this holds the handle and closes it. For the one handle the
 * running process uses, see `transition/legacy-database.ts`.
 */
export function buildDatabase(config: Config, logger: Logger): OwnedDatabase | undefined {
  const options = databaseOptions(config, { logger });
  return options && createDatabase(options);
}
