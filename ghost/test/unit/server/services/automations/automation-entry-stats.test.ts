import assert from 'node:assert/strict';
import { afterEach, beforeEach, vi } from 'vitest';
import {
  getEntryStatsWindow,
  parseEntryStatsOptions,
} from '../../../../../core/server/services/automations/automation-entry-stats';

describe('automation entry history', function () {
  it('derives the window from the returned calendar with an exclusive end', function () {
    assert.deepEqual(
      getEntryStatsWindow(
        [
          { date: '2020-01-01', count: 2 },
          { date: '2026-01-01', count: 0 },
        ],
        'America/New_York',
      ),
      {
        date_from: '2020-01-01',
        date_to: '2026-01-02',
        bucket: 'day',
        timezone: 'America/New_York',
      },
    );
  });

  it('keeps a single zero bucket as a one-day window', function () {
    assert.deepEqual(getEntryStatsWindow([{ date: '2024-02-29', count: 0 }]), {
      date_from: '2024-02-29',
      date_to: '2024-03-01',
      bucket: 'day',
      timezone: 'UTC',
    });
  });
});

describe('automation statistics timezone', function () {
  it('defaults to UTC and normalizes a supplied timezone', function () {
    assert.equal(parseEntryStatsOptions({}).timezone, 'UTC');
    assert.equal(
      parseEntryStatsOptions({ timezone: 'america/new_york' }).timezone,
      'America/New_York',
    );
  });

  it.each(['invalid', '', null, 123])('rejects invalid timezone %s', function (timezone) {
    assert.throws(() => parseEntryStatsOptions({ timezone }), { errorType: 'ValidationError' });
  });
});

describe('automation entry date range', function () {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T01:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('keeps requests without dates unbounded', function () {
    assert.equal(parseEntryStatsOptions({}).window, undefined);
  });

  it.each([
    ['UTC', '2026-09-14', '2026-09-15'],
    ['America/New_York', '2026-09-13', '2026-09-14'],
    ['Pacific/Kiritimati', '2026-09-14', '2026-09-15'],
  ])(
    'defaults the end to today in %s and accepts today explicitly',
    function (timezone, today, end) {
      const expected = { date_from: today, date_to: end, bucket: 'day', timezone };
      assert.deepEqual(parseEntryStatsOptions({ date_from: today, timezone }).window, expected);
      assert.deepEqual(
        parseEntryStatsOptions({ date_from: today, date_to: today, timezone }).window,
        expected,
      );
    },
  );

  it.each([
    [{ date_from: '2026-09-14' }, 'date_from must not be in the future.'],
    [{ date_from: '2026-09-13', date_to: '2026-09-14' }, 'date_to must not be in the future.'],
    [{ date_to: '2026-09-13' }, 'date_from is required when date_to is provided.'],
  ])('rejects invalid boundaries with a clear explanation (%j)', function (options, context) {
    assert.throws(() => parseEntryStatsOptions({ ...options, timezone: 'America/New_York' }), {
      errorType: 'ValidationError',
      context,
    });
  });

  it.each([
    ['2024-02-28', '2024-03-01', '2024-03-02'],
    ['2024-03-10', '2024-03-10', '2024-03-11'],
    ['2024-11-03', '2024-11-03', '2024-11-04'],
  ])(
    'converts inclusive calendar dates %s–%s to an exclusive end',
    function (start, end, exclusive) {
      assert.deepEqual(
        parseEntryStatsOptions({ date_from: start, date_to: end, timezone: 'America/New_York' })
          .window,
        {
          date_from: start,
          date_to: exclusive,
          timezone: 'America/New_York',
          bucket: 'day',
        },
      );
    },
  );

  it.each([
    { date_to: '2024-01-01' },
    { date_from: '2024-02-30', date_to: '2024-03-01' },
    { date_from: '2024-03-02', date_to: '2024-03-01' },
    { date_from: '2024-01-01T00:00:00Z', date_to: '2024-01-02' },
    { date_from: ['2024-01-01'], date_to: '2024-01-02' },
    { date_from: '', date_to: '' },
    { date_from: '9999-12-31', date_to: '9999-12-31' },
  ])('rejects invalid options: %j', function (options) {
    assert.throws(() => parseEntryStatsOptions(options), { errorType: 'ValidationError' });
  });
});

describe('hourly entry windows', function () {
  it('keeps both repeated DST hours within the selected local day', function () {
    assert.deepEqual(
      getEntryStatsWindow(
        [
          { date: '2024-11-03T05:00:00Z', count: 1 },
          { date: '2024-11-04T04:00:00Z', count: 2 },
        ],
        'America/New_York',
      ),
      {
        date_from: '2024-11-03',
        date_to: '2024-11-04',
        bucket: 'hour',
        timezone: 'America/New_York',
      },
    );
  });
});
