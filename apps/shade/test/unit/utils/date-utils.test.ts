import { formatDisplayDate, formatDisplayDateWithRange, formatDisplayTime } from '@/lib/utils';
import { expect, vi } from 'vitest';

describe('date utils', function () {
  describe('formatDisplayDate function', function () {
    it('returns an empty string if the date string is an empty string', function () {
      const formatted = formatDisplayDate('');
      expect(formatted).toBe('');
    });

    it('returns an empty string if the date string is an invalid type', function () {
      // @ts-expect-error This should error if dateString is not a string, but for some reason Typescript isn't catching this
      const formatted = formatDisplayDate(123);
      expect(formatted).toBe('');
    });

    it('does not throw an error if the date string is a Date object', function () {
      const date = new Date('2023-04-15');
      // @ts-expect-error This should error if dateString is not a string, but for some reason Typescript isn't catching this
      const formatted = formatDisplayDate(date);
      expect(formatted).toBe('15 Apr 2023');
    });

    it('handles a date string with time but without a timezone', function () {
      const formatted = formatDisplayDate('2023-04-15 12:00:00');
      expect(formatted).toBe('15 Apr 2023');
    });

    it('handles an ISO8601 date string', function () {
      const formatted = formatDisplayDate('2023-04-15T12:00:00Z');
      expect(formatted).toBe('15 Apr 2023');
    });

    it('formats a date string to display format', function () {
      // Using a predefined date for testing, bypassing the current date check
      // Test different year formatting without mocking Date
      const differentYearFormatted = formatDisplayDate('2020-12-31');
      expect(differentYearFormatted).toBe('31 Dec 2020');
    });

    it('converts ISO date to site timezone when timezone is provided', function () {
      // July 31, 2023 at midnight UTC - in America/New_York (UTC-4 in summer) this is July 30
      const formatted = formatDisplayDate('2023-07-31T00:00:00Z', 'America/New_York');
      expect(formatted).toBe('30 Jul 2023');
    });

    it('converts ISO date to site timezone correctly for positive offset', function () {
      // July 30, 2023 at 11pm UTC - in Europe/Berlin (UTC+2 in summer) this is July 31
      const formatted = formatDisplayDate('2023-07-30T23:00:00Z', 'Europe/Berlin');
      expect(formatted).toBe('31 Jul 2023');
    });

    it('formats date in UTC when no timezone is provided for ISO dates', function () {
      // July 31, 2023 at midnight UTC - should show July 31 without timezone conversion
      const formatted = formatDisplayDate('2023-07-31T00:00:00Z');
      expect(formatted).toBe('31 Jul 2023');
    });

    it('reads an ISO date-time without an offset as site time when timezone is provided', function () {
      const formatted = formatDisplayDate('2023-07-31T00:30:00', 'Pacific/Kiritimati');
      expect(formatted).toBe('31 Jul 2023');
    });

    it('compares against the current year in the site timezone', function () {
      vi.useFakeTimers({ now: new Date('2025-12-31T23:30:00Z') });

      try {
        // Already 1 Jan 2026 in Kiritimati (UTC+14), so the year is omitted
        expect(formatDisplayDate('2025-12-31T23:30:00Z', 'Pacific/Kiritimati')).toBe('1 Jan');
        expect(formatDisplayDate('2025-12-31T09:00:00Z', 'Pacific/Kiritimati')).toBe('31 Dec 2025');
      } finally {
        vi.useRealTimers();
      }
    });

    it('returns "Invalid date" for an unparseable date when timezone is provided', function () {
      const formatted = formatDisplayDate('Tomorrow', 'Europe/Berlin');
      expect(formatted).toBe('Invalid date');
    });

    it('returns "Invalid date" for an impossible date when timezone is provided', function () {
      const formatted = formatDisplayDate('2025-02-30T10:00:00', 'Europe/Berlin');
      expect(formatted).toBe('Invalid date');
    });

    it('returns "Invalid date" for an unparseable date', function () {
      expect(formatDisplayDate('yesterday')).toBe('Invalid date');
      expect(formatDisplayDate('yesterday', 'Europe/Berlin')).toBe('Invalid date');
      expect(formatDisplayDate('2025-13-01T00:00:00')).toBe('Invalid date');
    });

    it('reads a date-time without an offset as wall-clock time when no timezone is provided', function () {
      // East of UTC, so reading it as browser time and formatting in UTC would land on the previous day
      vi.stubEnv('TZ', 'Asia/Tokyo');

      try {
        expect(formatDisplayDate('2023-07-31T05:00:00')).toBe('31 Jul 2023');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('falls back to UTC for a timezone the browser does not know', function () {
      expect(formatDisplayDate('2020-04-20T23:30:00Z', 'Not/A_Zone')).toBe('20 Apr 2020');
    });

    it('moves a date skipped by a timezone change forward', function () {
      // Samoa skipped 30 Dec 2011 when it moved across the International Date Line
      expect(formatDisplayDate('2011-12-30T12:00:00', 'Pacific/Apia')).toBe('31 Dec 2011');
    });
  });

  describe('formatDisplayTime function', function () {
    it('formats time in the provided timezone', function () {
      const formatted = formatDisplayTime('2020-04-20T18:09:12.345Z', 'Africa/Lagos');
      expect(formatted).toBe('7:09pm');
    });

    it('formats time in UTC without a timezone, matching formatDisplayDate', function () {
      vi.stubEnv('TZ', 'America/New_York');
      try {
        expect(formatDisplayTime('2020-04-20T18:09:12.345Z', '')).toBe('6:09pm');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('handles timezones with negative offsets', function () {
      const formatted = formatDisplayTime('2020-04-20T18:09:12.345Z', 'America/New_York');
      expect(formatted).toBe('2:09pm');
    });

    it('handles times that cross a date boundary', function () {
      const formatted = formatDisplayTime('2020-04-20T00:30:00.000Z', 'America/Los_Angeles');
      expect(formatted).toBe('5:30pm');
    });

    it('formats midnight and noon in 12-hour time', function () {
      expect(formatDisplayTime('2020-04-20T00:05:00Z', 'Etc/UTC')).toBe('12:05am');
      expect(formatDisplayTime('2020-04-20T12:00:00Z', 'Etc/UTC')).toBe('12:00pm');
    });

    it('handles timezones with non-hour offsets', function () {
      expect(formatDisplayTime('2020-04-20T18:09:00Z', 'Asia/Kolkata')).toBe('11:39pm');
      expect(formatDisplayTime('2020-04-20T18:09:00Z', 'Pacific/Chatham')).toBe('6:54am');
    });

    it('reads an ISO date-time without an offset as site time', function () {
      const formatted = formatDisplayTime('2023-07-31T00:30:00', 'Pacific/Kiritimati');
      expect(formatted).toBe('12:30am');
    });

    it('returns an empty string without a date', function () {
      expect(formatDisplayTime('', 'Europe/Berlin')).toBe('');
    });

    it('returns "Invalid date" for an unparseable date', function () {
      const formatted = formatDisplayTime('not a date', 'Europe/Berlin');
      expect(formatted).toBe('Invalid date');
    });

    it('returns "Invalid date" for an impossible date or time', function () {
      expect(formatDisplayTime('2025-02-30T10:00:00', 'Europe/Berlin')).toBe('Invalid date');
      expect(formatDisplayTime('2025-04-15T25:99:00', 'Europe/Berlin')).toBe('Invalid date');
      expect(formatDisplayTime('2025-04-15T23:59:60', 'Europe/Berlin')).toBe('Invalid date');
      expect(formatDisplayTime('2025-04-15T10:00:00+24:00', 'Europe/Berlin')).toBe('Invalid date');
    });

    it('reads the ISO 8601 forms moment reads', function () {
      expect(formatDisplayTime('2020-04-20T18Z', 'Africa/Lagos')).toBe('7:00pm');
      expect(formatDisplayTime('2020-04-20T18:09+0100', 'Africa/Lagos')).toBe('6:09pm');
      expect(formatDisplayTime('2020-04-20 18:09:00,5-05:00', 'Africa/Lagos')).toBe('12:09am');
      expect(formatDisplayTime('20200420T180900Z', 'Africa/Lagos')).toBe('7:09pm');
    });

    it('moves a time skipped by a daylight saving change forward', function () {
      expect(formatDisplayTime('2025-03-09T02:30:00', 'America/New_York')).toBe('3:30am');
    });

    it('falls back to UTC for a timezone the browser does not know', function () {
      expect(formatDisplayTime('2020-04-20T18:09:00Z', 'Not/A_Zone')).toBe('6:09pm');
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
      expect(formatDisplayDateWithRange('2025-04-15 13:05:00', 1, true, true)).toBe('1:05pm');
      expect(formatDisplayDateWithRange('2025-04-15T00:30:00', 1, true, true)).toBe('12:30am');
    });

    it('formats the day and hour for a single-day range with hours', function () {
      const formatted = formatDisplayDateWithRange('2025-04-15 13:05:00', 1, true);
      expect(formatted).toBe('Apr 15, 1:05pm');
    });

    it('formats the month and year for ranges over a year', function () {
      expect(formatDisplayDateWithRange('2025-04-01', 366)).toBe('Apr 2025');
      expect(formatDisplayDateWithRange('2025-01-01', 366)).toBe('Jan 2025');
    });

    it('converts timestamps with an offset to local time', function () {
      expect(formatDisplayDateWithRange('2025-04-15T20:05:00Z', 1, true)).toBe('Apr 15, 1:05pm');
      expect(formatDisplayDateWithRange('2025-04-01T03:00:00Z', 366)).toBe('Mar 2025');
      expect(formatDisplayDateWithRange('2025-04-01T03:00:00Z', 91)).toBe('Week of 31 Mar 2025');
      expect(formatDisplayDateWithRange('2025-04-01T03:00:00Z', 30)).toBe('31 Mar 2025');
    });

    it('reads year-month and basic ISO 8601 dates as local dates', function () {
      expect(formatDisplayDateWithRange('2025-04', 366)).toBe('Apr 2025');
      expect(formatDisplayDateWithRange('20250415', 366)).toBe('Apr 2025');
    });

    it('formats the week start for ranges of 91 days or more', function () {
      const formatted = formatDisplayDateWithRange('2025-04-14', 91);
      expect(formatted).toBe('Week of 14 Apr 2025');
    });

    it('formats a plain date for shorter ranges', function () {
      expect(formatDisplayDateWithRange('2025-04-15', 30)).toBe('15 Apr 2025');
      expect(formatDisplayDateWithRange('2025-04-15', 1)).toBe('15 Apr 2025');
    });

    it('returns an empty string without a date', function () {
      expect(formatDisplayDateWithRange('', 30)).toBe('');
      // @ts-expect-error Chart data can be missing a date at runtime
      expect(formatDisplayDateWithRange(undefined, 366)).toBe('');
    });

    it('returns "Invalid date" for an unparseable date', function () {
      expect(formatDisplayDateWithRange('undefined', 366)).toBe('Invalid date');
      expect(formatDisplayDateWithRange('undefined', 120)).toBe('Invalid date');
      expect(formatDisplayDateWithRange('undefined', 30)).toBe('Invalid date');
    });

    it('returns "Invalid date" for an impossible date or time', function () {
      expect(formatDisplayDateWithRange('2025-13-01', 366)).toBe('Invalid date');
      expect(formatDisplayDateWithRange('2025-04-15 24:00:00', 1, true, true)).toBe('Invalid date');
    });
  });
});
