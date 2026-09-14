import assert from 'node:assert/strict';
import {
  fillEntryStats,
  getEntryStatsWindow,
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
