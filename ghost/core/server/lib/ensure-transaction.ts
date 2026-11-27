import type { Knex } from 'knex';

/**
 * The transaction `executor` is, or undefined when `executor` is a plain connection.
 *
 * Knex sets `executionPromise` on a transaction before it runs anything inside that transaction,
 * and never sets `executionPromise` on a plain connection.
 */
export function transactionOf(executor: Knex | Knex.Transaction): Knex.Transaction | undefined {
  return 'executionPromise' in executor ? executor : undefined;
}

/**
 * Runs `fn` inside one transaction, so everything `fn` writes is stored together or not at all.
 *
 * When `executor` is already a transaction, `fn` joins that transaction: `fn` is handed the same
 * transaction, nothing is committed here, and a failure in `fn` is the caller's to roll back.
 * When `executor` is a plain connection, a new transaction is opened on it, committed when `fn`
 * resolves and rolled back when `fn` rejects.
 *
 * Joining never opens a savepoint, which is what calling `transaction()` on a transaction does.
 * A savepoint can be rolled back while the transaction around it still commits, and its
 * `executionPromise` resolves when the savepoint is released rather than when the transaction
 * commits, so work waiting for the commit would run too early.
 */
export function ensureTransaction<T>(
  executor: Knex | Knex.Transaction,
  fn: (trx: Knex.Transaction) => Promise<T>,
): Promise<T> {
  const joined = transactionOf(executor);
  return joined ? fn(joined) : executor.transaction(fn);
}
