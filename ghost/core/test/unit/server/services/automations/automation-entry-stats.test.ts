import assert from 'node:assert/strict';
import {
  getEntryStatsWindow,
  parseEntryStatsTimezone,
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
    assert.equal(parseEntryStatsTimezone(undefined), 'UTC');
    assert.equal(parseEntryStatsTimezone('america/new_york'), 'America/New_York');
  });

  it.each(['invalid', '', null, 123])('rejects invalid timezone %s', function (timezone) {
    assert.throws(
      () => parseEntryStatsTimezone(timezone),
      /Invalid automation statistics timezone/,
    );
  });
});
