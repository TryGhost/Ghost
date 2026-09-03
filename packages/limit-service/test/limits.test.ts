import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import { MaxLimit } from '../src/limits.js';
import type { ErrorsModule, GhostErrorOptions } from '../src/types.js';

class HostLimitError extends Error {
  constructor({ message }: GhostErrorOptions) {
    super(message);
  }
}

class IncorrectUsageError extends Error {
  constructor({ message }: GhostErrorOptions) {
    super(message);
  }
}

const errors: ErrorsModule = { HostLimitError, IncorrectUsageError };

/**
 * Zero is a real answer to "how many are allowed" and "how many are there", and neither is
 * reachable from Ghost today, so these are here rather than in the tests that drive it.
 */
describe('Counted limits', function () {
  const build = (max: number, count: number) =>
    new MaxLimit({
      name: 'staff',
      config: {},
      max,
      counter: () => count,
      errors,
    });

  it('refuses everything when the caller overrides the maximum to zero', async function () {
    const limit = build(100, 0);

    await assert.rejects(
      () => limit.errorIfWouldGoOverLimit({ max: 0 }),
      (error: Error) => error instanceof HostLimitError,
    );
  });

  it('is not over a zero maximum when the caller says nothing is in use', async function () {
    const limit = build(0, 500);

    // The count says 500, but the caller states the real figure is zero. Reading that as
    // "no figure given" would fall back to the counter and refuse.
    await limit.errorIfIsOverLimit({ currentCount: 0 });
  });

  it('still refuses when the count genuinely exceeds the maximum', async function () {
    const limit = build(1, 5);

    await assert.rejects(
      () => limit.errorIfIsOverLimit(),
      (error: Error) => error instanceof HostLimitError,
    );
  });
});
