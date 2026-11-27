import type { Knex } from 'knex';

/** How many transactions are waiting for a lock on `table` in this database. MySQL only. */
export async function transactionsWaitingOn(knex: Knex, table: string): Promise<number> {
  const [rows] = await knex.raw(
    `
    SELECT COUNT(DISTINCT waits.REQUESTING_ENGINE_TRANSACTION_ID) AS waiting
    FROM performance_schema.data_lock_waits AS waits
    JOIN performance_schema.data_locks AS requested
      ON requested.ENGINE_LOCK_ID = waits.REQUESTING_ENGINE_LOCK_ID
    WHERE requested.OBJECT_SCHEMA = DATABASE()
      AND requested.OBJECT_NAME = ?
  `,
    [table],
  );
  return Number(rows[0].waiting);
}
