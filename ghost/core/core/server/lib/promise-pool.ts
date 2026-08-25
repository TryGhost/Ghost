import errors from '@tryghost/errors';
import type { Promisable } from 'type-fest';

const validateMaxConcurrency = (maxConcurrency: number) => {
  if (maxConcurrency < 1 || !Number.isSafeInteger(maxConcurrency)) {
    throw new errors.IncorrectUsageError({
      message: 'Concurrency must be a positive integer',
    });
  }
};

/**
 * Run promise-returning tasks with a bounded level of concurrency.
 */
export async function promisePool<Result>(
  tasks: Array<() => Promisable<Result>>,
  maxConcurrency: number,
): Promise<Result[]> {
  validateMaxConcurrency(maxConcurrency);

  const taskIterator = tasks.entries();
  const results: Result[] = [];

  const workers = Array(maxConcurrency)
    .fill(taskIterator)
    .map(async (workerIterator) => {
      for (const [index, task] of workerIterator) {
        results[index] = await task();
      }
    });

  await Promise.all(workers);
  return results;
}
