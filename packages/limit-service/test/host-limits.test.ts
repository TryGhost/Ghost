import { strict as assert } from 'node:assert';

import { describe, it } from 'vitest';

import errors from './fixtures/errors.ts';
import { parseHostLimits, parseHostSubscription } from '../src/index.ts';

describe('Host limits', function () {
  describe('reading what a host configured', function () {
    it('reads a site with no limits as having none', function () {
      assert.deepEqual(parseHostLimits(undefined, errors), {});
      assert.deepEqual(parseHostLimits(null, errors), {});
      assert.deepEqual(parseHostLimits({}, errors), {});
    });

    it('reads the values a host sends as strings as the numbers they stand for', function () {
      // Ghost(Pro) keeps host settings in one string column, so this is the ordinary case
      // rather than the odd one. Everything downstream is typed as a number.
      assert.deepEqual(parseHostLimits({ staff: { max: '5' } }, errors), { staff: { max: 5 } });
      assert.deepEqual(parseHostLimits({ staff: { max: '0' } }, errors), { staff: { max: 0 } });
      assert.deepEqual(parseHostLimits({ emails: { maxPeriodic: '100' } }, errors), {
        emails: { maxPeriodic: 100 },
      });
    });

    it('keeps a value a host sends as a number', function () {
      assert.deepEqual(parseHostLimits({ staff: { max: 5 } }, errors), { staff: { max: 5 } });
    });

    it('reads a flag the way a host means it, including the string false', function () {
      // 'false' is truthy, so a host writing it switches the feature off. That is what a
      // site configured this way gets today, so it is what it keeps getting.
      assert.deepEqual(parseHostLimits({ limitAnalytics: { disabled: 'false' } }, errors), {
        limitAnalytics: { disabled: true },
      });
      assert.deepEqual(parseHostLimits({ limitAnalytics: { disabled: 'true' } }, errors), {
        limitAnalytics: { disabled: true },
      });
      assert.deepEqual(parseHostLimits({ limitAnalytics: { disabled: false } }, errors), {
        limitAnalytics: { disabled: false },
      });
    });

    it('keeps an allowlist and the wording a host wrote', function () {
      assert.deepEqual(
        parseHostLimits({ customThemes: { allowlist: ['casper'], error: 'Upgrade to use it.' } }, errors),
        { customThemes: { allowlist: ['casper'], error: 'Upgrade to use it.' } },
      );
    });
  });

  describe('a limit nobody could apply', function () {
    it('refuses a maximum that is not a number, naming the limit', function () {
      // The reason this cannot be tolerated: the comparison against a non-numeric maximum
      // is false whatever the count, so the limit reads as configured and never applies.
      assert.throws(() => parseHostLimits({ staff: { max: 'not-a-number' } }, errors), {
        message: /Host limit "staff" is misconfigured/,
      });
    });

    it('refuses a maximum of infinity', function () {
      assert.throws(() => parseHostLimits({ staff: { max: Infinity } }, errors), {
        message: /Host limit "staff" is misconfigured/,
      });
    });

    it('refuses an allowlist that is not a list', function () {
      assert.throws(() => parseHostLimits({ customThemes: { allowlist: 'casper' } }, errors), {
        message: /Host limit "customThemes" is misconfigured/,
      });
    });

    it('refuses a limit that is not an object at all', function () {
      assert.throws(() => parseHostLimits({ staff: 'yes' }, errors), {
        message: /Host limit "staff" is misconfigured/,
      });
    });

    it('refuses limits that are not a set of limits', function () {
      assert.throws(() => parseHostLimits('everything', errors), {
        message: /Host limits are misconfigured/,
      });
    });

    it('refuses the whole set rather than applying the readable part of it', function () {
      // Half a limit set is a site limited in ways nobody chose, which is harder to notice
      // than a site that refuses to start.
      assert.throws(() =>
        parseHostLimits({ staff: { max: 5 }, members: { max: 'lots' } }, errors),
      );
    });
  });

  describe('the subscription a periodic limit counts from', function () {
    it('reads a site without one as having none', function () {
      assert.equal(parseHostSubscription(undefined, errors), undefined);
      assert.equal(parseHostSubscription(null, errors), undefined);
    });

    it('reads the start date a host sent', function () {
      assert.deepEqual(parseHostSubscription({ start: '2026-01-01T00:00:00.000Z' }, errors), {
        startDate: '2026-01-01T00:00:00.000Z',
        interval: 'month',
      });
    });

    it('refuses a subscription with no start date', function () {
      assert.throws(() => parseHostSubscription({}, errors), {
        message: /Host subscription is misconfigured/,
      });
    });
  });
});
