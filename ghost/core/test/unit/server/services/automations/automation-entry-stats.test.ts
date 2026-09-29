import assert from 'node:assert/strict';
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
    { date_from: '2024-01-01' },
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
