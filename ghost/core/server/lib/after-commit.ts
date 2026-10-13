/**
 * Runs `fn` once the work it follows has committed.
 *
 * Without a transaction each query commits as it runs, so `fn` runs now, and whatever it
 * throws or returns is the caller's. Inside `transacting` it runs when that transaction
 * commits, after the caller has moved on, and not at all if it rolls back; a rollback, or a
 * failure in `fn`, goes to `onFailure`.
 *
 * Knex resolves a transaction rolled back without an error as if it had committed.
 */
export function afterCommit<T>(
  transacting: { executionPromise: Promise<unknown> } | undefined,
  fn: () => T,
  onFailure: (err: unknown) => void,
): T | undefined {
  if (!transacting) {
    return fn();
  }
  transacting.executionPromise.then(() => fn()).catch(onFailure);
  return undefined;
}
