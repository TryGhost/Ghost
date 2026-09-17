import assert from 'node:assert/strict';
import {
  fillEntryStats,
  getEntryStatsWindow,
  parseEntryStatsOptions,
} from '../../../../../core/server/services/automations/automation-entry-stats';

describe('automation entry history', function () {
  it('starts at the earliest entry, even when it is over 1000 days old', function () {
    assert.deepEqual(
      getEntryStatsWindow(
        [{ date: '2020-01-01', count: 2 }],
        new Date('2026-01-01T23:59:00-05:00'),
      ),
      {
        date_from: '2020-01-01',
        date_to: '2026-01-03',
        bucket: 'day',
        timezone: 'UTC',
      },
    );
  });

  it('represents an empty history as today’s zero in UTC', function () {
    const window = getEntryStatsWindow([], new Date('2026-01-01T23:59:00-05:00'));
    assert.deepEqual(fillEntryStats({ total_run_count: 0, entries: [] }, window), {
      total_run_count: 0,
      entries: [{ date: '2026-01-02', count: 0 }],
    });
  });

  it('fills missing days across leap day without changing the total', function () {
    const data = {
      total_run_count: 5,
      entries: [
        { date: '2024-03-01', count: 2 },
        { date: '2024-02-28', count: 3 },
      ],
    };
    const window = getEntryStatsWindow(data.entries, new Date('2024-03-01T00:00:00Z'));
    assert.deepEqual(fillEntryStats(data, window), {
      total_run_count: 5,
      entries: [
        { date: '2024-02-28', count: 3 },
        { date: '2024-02-29', count: 0 },
        { date: '2024-03-01', count: 2 },
      ],
    });
  });
});

describe('automation entry date range', function () {
  it('defaults to all time in UTC', function () {
    assert.deepEqual(parseEntryStatsOptions({}), { timezone: 'UTC' });
  });

  it('normalizes timezone names for Tinybird', function () {
    assert.equal(
      parseEntryStatsOptions({ timezone: 'america/new_york' }).timezone,
      'America/New_York',
    );
  });

  it('includes both date bounds and fills missing days across leap day', function () {
    const { window } = parseEntryStatsOptions({ date_from: '2024-02-28', date_to: '2024-03-01' });
    assert.ok(window);
    assert.deepEqual(window, {
      date_from: '2024-02-28',
      date_to: '2024-03-02',
      bucket: 'day',
      timezone: 'UTC',
    });
    assert.deepEqual(
      fillEntryStats({ total_run_count: 2, entries: [{ date: '2024-02-29', count: 2 }] }, window)
        .entries,
      [
        { date: '2024-02-28', count: 0 },
        { date: '2024-02-29', count: 2 },
        { date: '2024-03-01', count: 0 },
      ],
    );
  });

  it.each(['2024-03-10', '2024-11-03'])(
    'returns one bucket for a one-day selection (%s)',
    function (date) {
      const { window } = parseEntryStatsOptions({
        date_from: date,
        date_to: date,
        timezone: 'America/New_York',
      });
      assert.ok(window);
      assert.equal(window.timezone, 'America/New_York');
      assert.deepEqual(fillEntryStats({ total_run_count: 0, entries: [] }, window).entries, [
        { date, count: 0 },
      ]);
    },
  );

  it('uses the requested timezone for today in an empty all-time history', function () {
    const window = getEntryStatsWindow([], new Date('2024-03-11T01:00:00Z'), 'America/New_York');
    assert.deepEqual(window, {
      date_from: '2024-03-10',
      date_to: '2024-03-11',
      bucket: 'day',
      timezone: 'America/New_York',
    });
  });

  it.each([
    { date_from: '2024-01-01' },
    { date_to: '2024-01-01' },
    { date_from: '2024-02-30', date_to: '2024-03-01' },
    { date_from: '2024-03-02', date_to: '2024-03-01' },
    { date_from: '2024-01-01T00:00:00Z', date_to: '2024-01-02' },
    { date_from: ['2024-01-01'], date_to: '2024-01-02' },
    { date_from: '', date_to: '' },
    { date_from: '9999-12-31', date_to: '9999-12-31' },
    { timezone: 'not-a-timezone' },
    { timezone: '' },
  ])('rejects invalid options: %j', function (options) {
    assert.throws(() => parseEntryStatsOptions(options), { errorType: 'ValidationError' });
  });
});
