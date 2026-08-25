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
export const promisePool = async <T>(
  tasks: Array<() => Promisable<T>>,
  maxConcurrency: number,
): Promise<T[]> => {
  validateMaxConcurrency(maxConcurrency);

  const taskIterator = tasks.entries();
  const results: T[] = [];

  const workers = Array(maxConcurrency)
    .fill(taskIterator)
    .map(async (workerIterator) => {
      for (const [index, task] of workerIterator) {
        results[index] = await task();
      }
    });

  await Promise.all(workers);
  return results;
};
