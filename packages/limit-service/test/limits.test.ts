import { strict as assert } from 'node:assert';
import { describe, it } from 'vitest';

import { LimitService } from '../src/limit-service.js';
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

/**
 * Limits are re-read while a site is running: the billing view asks for them again when a
 * plan changes. That is the only moment the service holds two configurations, and the only
 * place these can go wrong, so it is checked here rather than through anything that drives
 * Ghost.
 */
describe('Reloading limits', function () {
  it('does not test a limit against a different module than it was built with', async function () {
    const service = new LimitService();
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });

    service.loadLimits({
      limits: { staff: { max: 0 } },
      counters: {
        staff: async () => {
          await held;
          return 5;
        },
      },
      errors,
    });

    // Start a check, then reload with a different error module while its counter is still
    // waiting. The limit under way was built with the first module; if the answer is tested
    // against the second, a real refusal escapes as an exception instead of returning true.
    const inFlight = service.checkWouldGoOverLimit('staff');

    class OtherHostLimitError extends Error {}
    class OtherIncorrectUsageError extends Error {}
    service.loadLimits({
      limits: { staff: { max: 100 } },
      counters: { staff: () => 0 },
      errors: {
        HostLimitError: OtherHostLimitError as unknown as ErrorsModule['HostLimitError'],
        IncorrectUsageError:
          OtherIncorrectUsageError as unknown as ErrorsModule['IncorrectUsageError'],
      },
    });

    release();

    assert.equal(await inFlight, true);
  });

  // The refusal happens before anything is resolved or assigned, so this says only that a
  // rejected reload leaves the site as it was. That the swap itself is ordered safely is
  // what the test above pins.
  it('keeps the limits it had when a reload is refused outright', async function () {
    const service = new LimitService();

    service.loadLimits({ limits: { limitSomething: { disabled: true } }, errors });
    assert.equal(service.isDisabled('limitSomething'), true);

    assert.throws(() => service.loadLimits({ limits: {} } as never));

    assert.equal(service.isDisabled('limitSomething'), true);
  });
});

/**
 * Whether a site is over any of its limits is asked without naming one, so every limit has
 * to be able to answer it. An allowlist limit cannot: it judges one particular value, and
 * there is no value in the question.
 */
describe('Checking every limit at once', function () {
  it('answers for a site that has an allowlist limit', async function () {
    const service = new LimitService();

    service.loadLimits({
      limits: { customThemes: { allowlist: ['casper'] }, staff: { max: 100 } },
      counters: { staff: () => 1 },
      errors,
    });

    assert.equal(await service.checkIfAnyOverLimit(), false);
  });

  it('still reports a site that is over a limit it can answer for', async function () {
    const service = new LimitService();

    service.loadLimits({
      limits: { customThemes: { allowlist: ['casper'] }, staff: { max: 0 } },
      counters: { staff: () => 5 },
      errors,
    });

    assert.equal(await service.checkIfAnyOverLimit(), true);
  });
});

/**
 * A service is constructed before it is given anything, and one consumer deliberately never
 * gives it anything: a self-hosted site has no host limits, so Admin builds the service and
 * leaves it empty. Asking it a question then has to answer, not fail.
 */
describe('A service that was never loaded', function () {
  it('answers that it is not limited', function () {
    assert.equal(new LimitService().isLimited('staff'), false);
  });

  it('answers the over-limit checks rather than throwing', async function () {
    const service = new LimitService();

    assert.equal(await service.checkIsOverLimit('staff'), undefined);
    assert.equal(await service.checkWouldGoOverLimit('staff'), undefined);
  });

  it('lets the error-raising checks pass', async function () {
    const service = new LimitService();

    await service.errorIfIsOverLimit('staff');
    await service.errorIfWouldGoOverLimit('staff');
  });
});

