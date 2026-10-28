import * as assert from 'assert/strict';
import { formatDisplayDate, formatDisplayDateWithRange, formatDisplayTime } from '@/lib/utils';
import { vi } from 'vitest';

describe('date utils', function () {
  describe('formatDisplayDate function', function () {
    it('returns an empty string if the date string is an empty string', function () {
      const formatted = formatDisplayDate('');
      assert.equal(formatted, '');
    });

    it('returns an empty string if the date string is an invalid type', function () {
      // @ts-expect-error This should error if dateString is not a string, but for some reason Typescript isn't catching this
      const formatted = formatDisplayDate(123);
      assert.equal(formatted, '');
    });

    it('does not throw an error if the date string is a Date object', function () {
      const date = new Date('2023-04-15');
      // @ts-expect-error This should error if dateString is not a string, but for some reason Typescript isn't catching this
      const formatted = formatDisplayDate(date);
      assert.equal(formatted, '15 Apr 2023');
    });

    it('handles a date string with time but without a timezone', function () {
      const formatted = formatDisplayDate('2023-04-15 12:00:00');
      assert.equal(formatted, '15 Apr 2023');
    });

    it('handles an ISO8601 date string', function () {
      const formatted = formatDisplayDate('2023-04-15T12:00:00Z');
      assert.equal(formatted, '15 Apr 2023');
    });

    it('formats a date string to display format', function () {
      // Using a predefined date for testing, bypassing the current date check
      // Test different year formatting without mocking Date
      const differentYearFormatted = formatDisplayDate('2020-12-31');
      assert.equal(differentYearFormatted, '31 Dec 2020');
    });

    it('converts ISO date to site timezone when timezone is provided', function () {
      // July 31, 2023 at midnight UTC - in America/New_York (UTC-4 in summer) this is July 30
      const formatted = formatDisplayDate('2023-07-31T00:00:00Z', 'America/New_York');
      assert.equal(formatted, '30 Jul 2023');
    });

    it('converts ISO date to site timezone correctly for positive offset', function () {
      // July 30, 2023 at 11pm UTC - in Europe/Berlin (UTC+2 in summer) this is July 31
      const formatted = formatDisplayDate('2023-07-30T23:00:00Z', 'Europe/Berlin');
      assert.equal(formatted, '31 Jul 2023');
    });

    it('formats date in UTC when no timezone is provided for ISO dates', function () {
      // July 31, 2023 at midnight UTC - should show July 31 without timezone conversion
      const formatted = formatDisplayDate('2023-07-31T00:00:00Z');
      assert.equal(formatted, '31 Jul 2023');
    });

    it('reads an ISO date-time without an offset as site time when timezone is provided', function () {
      const formatted = formatDisplayDate('2023-07-31T00:30:00', 'Pacific/Kiritimati');
      assert.equal(formatted, '31 Jul 2023');
    });

    it('compares against the current year in the site timezone', function () {
      vi.useFakeTimers({ now: new Date('2025-12-31T23:30:00Z') });

      try {
        // Already 1 Jan 2026 in Kiritimati (UTC+14), so the year is omitted
        assert.equal(formatDisplayDate('2025-12-31T23:30:00Z', 'Pacific/Kiritimati'), '1 Jan');
        assert.equal(
          formatDisplayDate('2025-12-31T09:00:00Z', 'Pacific/Kiritimati'),
          '31 Dec 2025',
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('returns an empty string for an unparseable date when timezone is provided', function () {
      const formatted = formatDisplayDate('Tomorrow', 'Europe/Berlin');
      assert.equal(formatted, '');
    });

    it('returns an empty string for an impossible date when timezone is provided', function () {
      const formatted = formatDisplayDate('2025-02-30T10:00:00', 'Europe/Berlin');
      assert.equal(formatted, '');
    });

    it('returns an empty string for an unparseable date', function () {
      assert.equal(formatDisplayDate('yesterday'), '');
      assert.equal(formatDisplayDate('yesterday', 'Europe/Berlin'), '');
      assert.equal(formatDisplayDate('2025-13-01T00:00:00'), '');
    });

    it('reads a date-time without an offset as wall-clock time when no timezone is provided', function () {
      // East of UTC, so reading it as browser time and formatting in UTC would land on the previous day
      vi.stubEnv('TZ', 'Asia/Tokyo');

      try {
        assert.equal(formatDisplayDate('2023-07-31T05:00:00'), '31 Jul 2023');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('falls back to UTC for a timezone the browser does not know', function () {
      assert.equal(formatDisplayDate('2020-04-20T23:30:00Z', 'Not/A_Zone'), '20 Apr 2020');
    });

    it('moves a date skipped by a timezone change forward', function () {
      // Samoa skipped 30 Dec 2011 when it moved across the International Date Line
      assert.equal(formatDisplayDate('2011-12-30T12:00:00', 'Pacific/Apia'), '31 Dec 2011');
    });
  });

  describe('formatDisplayTime function', function () {
    it('formats time in the provided timezone', function () {
      const formatted = formatDisplayTime('2020-04-20T18:09:12.345Z', 'Africa/Lagos');
      assert.equal(formatted, '7:09pm');
    });

    it('formats time in UTC without a timezone, matching formatDisplayDate', function () {
      vi.stubEnv('TZ', 'America/New_York');
      try {
        assert.equal(formatDisplayTime('2020-04-20T18:09:12.345Z', ''), '6:09pm');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('handles timezones with negative offsets', function () {
      const formatted = formatDisplayTime('2020-04-20T18:09:12.345Z', 'America/New_York');
      assert.equal(formatted, '2:09pm');
    });

    it('handles times that cross a date boundary', function () {
      const formatted = formatDisplayTime('2020-04-20T00:30:00.000Z', 'America/Los_Angeles');
      assert.equal(formatted, '5:30pm');
    });

    it('formats midnight and noon in 12-hour time', function () {
      assert.equal(formatDisplayTime('2020-04-20T00:05:00Z', 'Etc/UTC'), '12:05am');
      assert.equal(formatDisplayTime('2020-04-20T12:00:00Z', 'Etc/UTC'), '12:00pm');
    });

    it('handles timezones with non-hour offsets', function () {
      assert.equal(formatDisplayTime('2020-04-20T18:09:00Z', 'Asia/Kolkata'), '11:39pm');
      assert.equal(formatDisplayTime('2020-04-20T18:09:00Z', 'Pacific/Chatham'), '6:54am');
    });

    it('reads an ISO date-time without an offset as site time', function () {
      const formatted = formatDisplayTime('2023-07-31T00:30:00', 'Pacific/Kiritimati');
      assert.equal(formatted, '12:30am');
    });

    it('returns an empty string for an unparseable date', function () {
      const formatted = formatDisplayTime('not a date', 'Europe/Berlin');
      assert.equal(formatted, '');
    });

    it('returns an empty string for an impossible date or time', function () {
      assert.equal(formatDisplayTime('2025-02-30T10:00:00', 'Europe/Berlin'), '');
      assert.equal(formatDisplayTime('2025-04-15T25:99:00', 'Europe/Berlin'), '');
      assert.equal(formatDisplayTime('2025-04-15T23:59:60', 'Europe/Berlin'), '');
      assert.equal(formatDisplayTime('2025-04-15T10:00:00+24:00', 'Europe/Berlin'), '');
    });

    it('reads the ISO 8601 forms moment reads', function () {
      assert.equal(formatDisplayTime('2020-04-20T18Z', 'Africa/Lagos'), '7:00pm');
      assert.equal(formatDisplayTime('2020-04-20T18:09+0100', 'Africa/Lagos'), '6:09pm');
      assert.equal(formatDisplayTime('2020-04-20 18:09:00,5-05:00', 'Africa/Lagos'), '12:09am');
      assert.equal(formatDisplayTime('20200420T180900Z', 'Africa/Lagos'), '7:09pm');
    });

    it('moves a time skipped by a daylight saving change forward', function () {
      assert.equal(formatDisplayTime('2025-03-09T02:30:00', 'America/New_York'), '3:30am');
    });

    it('falls back to UTC for a timezone the browser does not know', function () {
      assert.equal(formatDisplayTime('2020-04-20T18:09:00Z', 'Not/A_Zone'), '6:09pm');
    });
  });

  describe('formatDisplayDateWithRange function', function () {
    // West of UTC, so reading a date-only string as UTC midnight would land on the previous day
    beforeEach(function () {
      vi.stubEnv('TZ', 'America/Los_Angeles');
    });

    afterEach(function () {
      vi.unstubAllEnvs();
    });

    it('formats the hour for a single-day range when only hours are requested', function () {
      assert.equal(formatDisplayDateWithRange('2025-04-15 13:05:00', 1, true, true), '1:05pm');
      assert.equal(formatDisplayDateWithRange('2025-04-15T00:30:00', 1, true, true), '12:30am');
    });

    it('formats the day and hour for a single-day range with hours', function () {
      const formatted = formatDisplayDateWithRange('2025-04-15 13:05:00', 1, true);
      assert.equal(formatted, 'Apr 15, 1:05pm');
    });

    it('formats the month and year for ranges over a year', function () {
      assert.equal(formatDisplayDateWithRange('2025-04-01', 366), 'Apr 2025');
      assert.equal(formatDisplayDateWithRange('2025-01-01', 366), 'Jan 2025');
    });

    it('converts timestamps with an offset to local time', function () {
      assert.equal(formatDisplayDateWithRange('2025-04-15T20:05:00Z', 1, true), 'Apr 15, 1:05pm');
      assert.equal(formatDisplayDateWithRange('2025-04-01T03:00:00Z', 366), 'Mar 2025');
      assert.equal(formatDisplayDateWithRange('2025-04-01T03:00:00Z', 91), 'Week of 31 Mar 2025');
      assert.equal(formatDisplayDateWithRange('2025-04-01T03:00:00Z', 30), '31 Mar 2025');
    });

    it('reads year-month and basic ISO 8601 dates as local dates', function () {
      assert.equal(formatDisplayDateWithRange('2025-04', 366), 'Apr 2025');
      assert.equal(formatDisplayDateWithRange('20250415', 366), 'Apr 2025');
    });

    it('formats the week start for ranges of 91 days or more', function () {
      const formatted = formatDisplayDateWithRange('2025-04-14', 91);
      assert.equal(formatted, 'Week of 14 Apr 2025');
    });

    it('formats a plain date for shorter ranges', function () {
      assert.equal(formatDisplayDateWithRange('2025-04-15', 30), '15 Apr 2025');
      assert.equal(formatDisplayDateWithRange('2025-04-15', 1), '15 Apr 2025');
    });

    it('returns an empty string for an unparseable date', function () {
      assert.equal(formatDisplayDateWithRange('undefined', 366), '');
      assert.equal(formatDisplayDateWithRange('undefined', 30), '');
    });

    it('returns an empty string for an impossible date or time', function () {
      assert.equal(formatDisplayDateWithRange('2025-13-01', 366), '');
      assert.equal(formatDisplayDateWithRange('2025-04-15 24:00:00', 1, true, true), '');
    });
  });
});
