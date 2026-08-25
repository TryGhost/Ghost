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
export const promisePool = async (
  tasks: Array<() => Promisable<unknown>>,
  maxConcurrency: number,
): Promise<void> => {
  validateMaxConcurrency(maxConcurrency);

  const taskIterator = tasks.values();

  const workers = Array(maxConcurrency)
    .fill(taskIterator)
    .map(async (workerIterator) => {
      for (const task of workerIterator) {
        await task();
      }
    });

  await Promise.all(workers);
};
