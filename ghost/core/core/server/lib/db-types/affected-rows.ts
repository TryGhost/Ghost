import { z } from 'zod';
import { DbCount } from './count';

const rawUpdateResult = z.union([
  z.tuple([z.object({ affectedRows: DbCount })]).rest(z.unknown()),
  z.object({ changes: DbCount }),
]);

/** Normalize Knex raw UPDATE results from MySQL tuples and SQLite run results. */
export function getAffectedRows(result: unknown): number {
  const parsed = rawUpdateResult.parse(result);
  return Array.isArray(parsed) ? parsed[0].affectedRows : parsed.changes;
}
