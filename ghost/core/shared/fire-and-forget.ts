import type { Promisable } from 'type-fest';
import noop from 'lodash/noop';

/**
 * Run a function and completely ignore the results.
 */
export const fireAndForget = (fn: () => Promisable<unknown>): void => {
  try {
    void Promise.resolve(fn()).catch(noop);
  } catch {
    // Ignore synchronous failures too.
  }
};
