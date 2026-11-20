/**
 * Runs `fn` once the work it follows has committed.
 *
 * Without a transaction each query commits as it runs, so `fn` runs now, and whatever it
 * throws or returns is the caller's. Inside `transacting` it runs when the outermost
 * transaction around it commits, after the caller has moved on, and not at all if
 * `transacting` or any transaction around it rolls back; a rollback, or a failure in `fn`,
 * goes to `onFailure`.
 *
 * Knex resolves a transaction rolled back without an error as if it had committed.
 */
export function afterCommit<T>(
  transacting: Transaction | undefined,
  fn: () => T,
  onFailure: (err: unknown) => void,
): T | undefined {
  if (!transacting) {
    return fn();
  }
  Promise.all(enclosing(transacting).map((transaction) => transaction.executionPromise))
    .then(() => fn())
    .catch(onFailure);
  return undefined;
}

type Transaction = { executionPromise: Promise<unknown>; parentTransaction?: Transaction };

// A savepoint's executionPromise resolves when the savepoint is released, before
// anything inside it is committed, and a savepoint can roll back while the
// transaction around it still commits. The work has committed only when every
// transaction from the savepoint out has.
function enclosing(transaction: Transaction): Transaction[] {
  const chain: Transaction[] = [];
  for (let current: Transaction | undefined = transaction; current;) {
    chain.push(current);
    current = current.parentTransaction;
  }
  return chain;
}
