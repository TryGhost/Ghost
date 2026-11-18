import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { getAffectedRows } from '../../lib/db-types/affected-rows';
import { defaultIndexName } from '../../data/schema/lib/default-index-name';
import type { TableName } from '../../data/schema/schema';
import type { JobsService } from '../../services/jobs-service/jobs-service';
import ClearExpiredAuthRowsJob from './clear-expired-auth-rows-job';
import { usesBetterAuth } from './enabled';

// Better Auth reads expiry on use but never purges these rows (plan §4.6)
const TABLES = ['user_sessions', 'verifications'] satisfies TableName[];
const BATCH_SIZE = 500;

type Table = (typeof TABLES)[number];

/**
 * Deletes expired rows in batches. Reads the ids first, then deletes by
 * primary key, so it locks rows in the same order as Better Auth's writes; a
 * DELETE ranging over the expiry index can deadlock with them.
 */
export async function clearExpiredAuthRows(
  knex: Knex,
  { batchSize = BATCH_SIZE }: { batchSize?: number } = {},
): Promise<Record<Table, number>> {
  const deleted = { user_sessions: 0, verifications: 0 };

  for (const table of TABLES) {
    for (;;) {
      const now = new Date();
      const ids: string[] = await knex(table)
        .where('expires_at', '<', now)
        .limit(batchSize)
        .pluck('id');

      if (ids.length === 0) {
        break;
      }

      // MySQL may still pick the expiry index for a short id list. SQLite (dev and testing only) reads the hint as a comment
      const result = await knex.raw(
        `DELETE /*+ NO_INDEX(${table} ${defaultIndexName(table, 'expires_at')}) */ FROM ?? WHERE ?? IN (${ids.map(() => '?').join(', ')}) AND ?? < ?`,
        [table, 'id', ...ids, 'expires_at', now],
      );
      deleted[table] += getAffectedRows(result);

      if (ids.length < batchSize) {
        break;
      }
    }
  }

  return deleted;
}

/** The job handler: a no-op where the tables don't exist */
export async function clearExpired(): Promise<void> {
  if (!usesBetterAuth()) {
    return;
  }
  const { knex } = require('../../data/db');
  const deleted = await clearExpiredAuthRows(knex);
  logging.info(
    { system: { event: 'clear_expired_auth_rows.completed', deleted } },
    `[Background Job] clear-expired-auth-rows removed ${deleted.user_sessions} sessions and ${deleted.verifications} verifications`,
  );
}

let scheduled = false;

/** Schedules the daily cleanup under either engine, since sessions outlive a rollback */
export async function scheduleClearExpiredJob(jobsService: JobsService): Promise<void> {
  if (scheduled || !usesBetterAuth()) {
    return;
  }

  // Random off-peak time (00:00-05:59) so a fleet of sites doesn't run at once
  const cron = `${Math.floor(Math.random() * 60)} ${Math.floor(Math.random() * 60)} ${Math.floor(Math.random() * 6)} * * *`;
  logging.info(`[Background Job] clear-expired-auth-rows scheduled at ${cron}`);
  await jobsService.scheduleRecurring(new ClearExpiredAuthRowsJob(), { cron });
  scheduled = true;
}
