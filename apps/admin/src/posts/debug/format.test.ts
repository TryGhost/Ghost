import { describe, expect, it } from 'vitest';
import { Temporal } from 'temporal-polyfill';
import {
  defaultRefetchRange,
  formatDebugDate,
  formatIngestionLag,
  formatPublishedDate,
  refetchRangeToUtc,
} from './format';

describe('debug dates', () => {
  it('keeps diagnostics in UTC, with optional millisecond precision', () => {
    expect(formatDebugDate('2026-09-10T11:30:01.023+02:00', true)).toBe(
      '10 Sep, 2026, 09:30:01.023 UTC',
    );
    expect(formatDebugDate('2026-09-10T11:30:01.023+02:00')).toBe('10 Sep, 2026, 09:30:01 UTC');
    expect(formatDebugDate(null)).toBe('N/A');
  });

  it('formats publication metadata in the site timezone across a date boundary', () => {
    expect(formatPublishedDate('2026-09-10T23:30:00Z', 'Europe/London')).toBe(
      '11 Sep 2026 at 00:30',
    );
  });

  it('limits the default range to a week after creation or an hour ago', () => {
    const now = Temporal.Instant.from('2026-09-10T12:00:00Z');
    expect(defaultRefetchRange('2026-09-01T10:00:00Z', now)).toEqual({
      begin: '2026-09-01T10:00',
      end: '2026-09-08T10:00',
    });
    expect(defaultRefetchRange('2026-09-09T10:00:00Z', now)).toEqual({
      begin: '2026-09-09T10:00',
      end: '2026-09-10T11:00',
    });
  });

  it('interprets date inputs as UTC even on a daylight saving transition', () => {
    expect(refetchRangeToUtc({ begin: '2026-03-29T01:30', end: '2026-03-29T02:30' })).toEqual({
      begin: '2026-03-29T01:30:00.000Z',
      end: '2026-03-29T02:30:00.000Z',
    });
    expect(() => refetchRangeToUtc({ begin: '2026-09-10T12:00', end: '2026-09-10T11:00' })).toThrow(
      'Choose a begin date',
    );
    expect(() => refetchRangeToUtc({ begin: '', end: '' })).toThrow();
  });
});

it('formats ingestion lag without wrapping days and tolerates absent older-backend fields', () => {
  expect(formatIngestionLag(90061)).toBe('1d 1h 1m 1s');
  expect(formatIngestionLag(0)).toBe('0s');
  expect(formatIngestionLag(60)).toBe('1m');
  for (const value of [undefined, null, -1, NaN, Infinity]) {
    expect(formatIngestionLag(value)).toBe('N/A');
  }
});
