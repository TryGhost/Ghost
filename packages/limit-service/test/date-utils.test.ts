import { DateTime } from 'luxon';
import { strict as assert } from 'node:assert';
import { afterEach, describe, it, vi } from 'vitest';

import { lastPeriodStart } from '../src/date-utils.js';
import type { Interval } from '../src/types.js';

/**
 * Carried over from TryGhost/SDK with its assertions rewritten. The maths is the one part
 * of the original worth keeping verbatim: where a billing period starts decides when an
 * allowance resets, and getting it wrong charges someone on the wrong day.
 */
describe('Date Utils', function () {
  describe('fn: lastPeriodStart', function () {
    afterEach(function () {
      vi.useRealTimers();
    });

    function at(now: string) {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));
    }

    it('returns same date if current date is less than a period away from current date', function () {
      const weekAgo = DateTime.now().toUTC().plus({ weeks: -1 });

      assert.equal(lastPeriodStart(weekAgo.toISO() as string, 'month'), weekAgo.toISO());
    });

    it("returns beginning of last month's period", function () {
      const weekAgo = DateTime.now().toUTC().plus({ weeks: -1 });
      const weekAndAMonthAgo = weekAgo.plus({ months: -1 });

      assert.equal(lastPeriodStart(weekAndAMonthAgo.toISO() as string, 'month'), weekAgo.toISO());
    });

    it('returns 3rd day of current month when a monthly period started on the 3rd', function () {
      at('2021-08-18T19:00:52Z');

      assert.equal(lastPeriodStart('2020-03-03T23:00:01Z', 'month'), '2021-08-03T23:00:01.000Z');
    });

    it('returns the 5th of last month when today is the 3rd', function () {
      at('2021-09-03T12:12:12Z');

      assert.equal(lastPeriodStart('2020-03-05T11:11:11Z', 'month'), '2021-08-05T11:11:11.000Z');
    });

    it('returns 29 February when the period started on the 31st and it is a leap year', function () {
      at('2020-03-05T13:15:07Z');

      assert.equal(lastPeriodStart('2020-01-31T23:00:01Z', 'month'), '2020-02-29T23:00:01.000Z');
    });

    it('returns 28 February when the period started on the 30th and it is not a leap year', function () {
      at('2021-03-05T13:15:07Z');

      assert.equal(lastPeriodStart('2019-04-30T01:59:42Z', 'month'), '2021-02-28T01:59:42.000Z');
    });

    it('refuses a start date it cannot read', function () {
      // Otherwise this yields an invalid date whose ISO form is null, and the caller counts
      // against nothing while believing it has a period.
      assert.throws(
        () => lastPeriodStart('the first of never', 'month'),
        (error: Error) => {
          assert.match(error.message, /Invalid start date/);
          return true;
        },
      );
    });

    it('refuses an interval it does not support', function () {
      assert.throws(
        () => lastPeriodStart('2021-01-01T00:00:00Z', 'week' as Interval),
        (error: Error) => {
          assert.equal(
            error.message,
            'Invalid interval specified. Only "month" value is accepted.',
          );
          return true;
        },
      );
    });
  });
});
