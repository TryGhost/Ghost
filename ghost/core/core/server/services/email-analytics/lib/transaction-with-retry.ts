import { setTimeout as delay } from 'node:timers/promises';
import type { Knex } from 'knex';

// Lock waits are expected while batch creation inserts recipients for the same
// email; both errors leave the transaction rolled back and safe to retry.
const RETRYABLE_LOCK_ERRORS = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);
const MAX_ATTEMPTS = 3;

/**
 * Run a transaction, retrying the whole rolled-back transaction after a lock
 * error. Never retries an individual write, and lets connection or commit
 * errors escape because their outcome is unknown.
 */
export async function transactionWithRetry<T>(
  knex: Pick<Knex, 'transaction'>,
  callback: (trx: Knex.Transaction) => Promise<T>,
  config?: Knex.TransactionConfig,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await knex.transaction(callback, config);
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (
        typeof code !== 'string' ||
        !RETRYABLE_LOCK_ERRORS.has(code) ||
        attempt >= MAX_ATTEMPTS - 1
      ) {
        throw error;
      }
      await delay(10 * 2 ** attempt + Math.random() * 10);
    }
  }
}
