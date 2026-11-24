import type { Foundation } from '#kernel/foundation';
// Still built the old way, when this module is first loaded. Building it moves to the foundry later.
import config from '../core/shared/config';
// Still built the old way, connecting when `knex` is first read. Building it moves to the foundry later.
import database from '../core/server/data/db';
import { buildLogger } from './logging';

let foundation: Foundation | undefined;

/**
 * Ghost's foundation: what the rest of Ghost is handed instead of importing
 * config, the logger or the database for itself. It is assembled on the first
 * call, by boot, and this is the only place it is held.
 */
export function ghostFoundation(): Foundation {
  foundation ??= { config, logging: buildLogger(config), database };
  return foundation;
}
