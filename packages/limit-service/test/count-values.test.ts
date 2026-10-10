import { describe, expect, it } from 'vitest';
import { MaxLimit, MaxPeriodicLimit } from '../src/index.ts';
import type { Count } from '../src/index.ts';
import errors from './fixtures/errors.ts';

describe.each(['max', 'periodic'] as const)('%s count values', (kind) => {
  const createLimit = (count: Count) => {
    const config = {
      currentCountQuery: () => count,
      error: '{{count}} of {{max}}',
    };
    return kind === 'max'
      ? new MaxLimit({name: 'members', config: {...config, max: 3}, errors})
      : new MaxPeriodicLimit({
        name: 'emails',
        config: {...config, maxPeriodic: 3, interval: 'month', startDate: '2026-01-01'},
        errors,
      });
  };

  it.each([
    {count: 2, wouldExceed: false, exceeds: false},
    {count: '2', wouldExceed: true, exceeds: false},
    {count: 4, wouldExceed: true, exceeds: true},
    {count: '4', wouldExceed: true, exceeds: true},
    {count: null, wouldExceed: false, exceeds: false},
    {count: undefined, wouldExceed: false, exceeds: false},
  ])('preserves comparisons and the raw count for $count', async ({count, wouldExceed, exceeds}) => {
    const limit = createLimit(count);
    expect(await limit.currentCountQuery()).toBe(count);

    if (wouldExceed) {
      await expect(limit.errorIfWouldGoOverLimit()).rejects.toMatchObject({
        errorType: 'HostLimitError', errorDetails: {total: count},
      });
    } else {
      await expect(limit.errorIfWouldGoOverLimit()).resolves.toBeUndefined();
    }

    if (exceeds) {
      await expect(limit.errorIfIsOverLimit()).rejects.toMatchObject({
        errorType: 'HostLimitError', errorDetails: {total: count},
      });
    } else {
      await expect(limit.errorIfIsOverLimit()).resolves.toBeUndefined();
    }
  });

  it.each([
    {count: null, formatted: '0'},
    {count: undefined, formatted: 'NaN'},
    {count: '9007199254740993', formatted: '9,007,199,254,740,993'},
  ])('preserves error formatting for $count', ({count, formatted}) => {
    expect(createLimit(count).generateError(count)).toMatchObject({
      message: `${formatted} of 3`, errorDetails: {total: count},
    });
  });
});
