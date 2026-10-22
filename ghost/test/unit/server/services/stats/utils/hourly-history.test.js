const assert = require('node:assert/strict');
const sinon = require('sinon');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  buildHourlyTotals,
  dayStartUtc,
  hasDayEnded,
  sumByLocalDay,
  utcBucketExpression,
} = require('../../../../../../core/server/services/stats/utils/hourly-history');

const HOURLY_HISTORY = path.resolve(
  __dirname,
  '../../../../../../core/server/services/stats/utils/hourly-history',
);

const apply = (total, event, direction) => total + direction * event.delta;

describe('Hourly history', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('replays the day hour by hour from where it started, up to now', function () {
    sinon.useFakeTimers(new Date('2026-10-21T10:30:00Z').getTime());

    const { hours, start } = buildHourlyTotals({
      date: '2026-10-21',
      timezone: 'UTC',
      current: 103,
      events: [
        { created_at: new Date('2026-10-21T03:36:00Z'), delta: 1 },
        { created_at: new Date('2026-10-21T05:10:00Z'), delta: 1 },
        { created_at: new Date('2026-10-21T05:50:00Z'), delta: 1 },
      ],
      apply,
    });

    assert.equal(start, 100);
    assert.equal(hours.length, 11);
    assert.deepEqual(
      hours.map((hour) => [hour.date, hour.totals]),
      [
        ['2026-10-21T00:00', 100],
        ['2026-10-21T01:00', 100],
        ['2026-10-21T02:00', 100],
        ['2026-10-21T03:00', 101],
        ['2026-10-21T04:00', 101],
        ['2026-10-21T05:00', 103],
        ['2026-10-21T06:00', 103],
        ['2026-10-21T07:00', 103],
        ['2026-10-21T08:00', 103],
        ['2026-10-21T09:00', 103],
        ['2026-10-21T10:00', 103],
      ],
    );
  });

  it('reads zone-less timestamps (SQLite) as UTC, whatever the process timezone', function () {
    // Test workers share one timezone, so this runs in a process of its own
    // in New York, where reading the text as local time would shift it 4 hours
    const script = `
      const { buildHourlyTotals } = require(${JSON.stringify(HOURLY_HISTORY)});
      const { hours } = buildHourlyTotals({
        date: '2026-10-20',
        timezone: 'UTC',
        current: 101,
        events: [{ created_at: '2026-10-20 03:36:00', delta: 1 }],
        apply: (total, event, direction) => total + direction * event.delta,
      });
      process.stdout.write(JSON.stringify(hours.slice(2, 5).map((hour) => hour.totals)));
    `;
    const output = execFileSync(process.execPath, ['-e', script], {
      env: { ...process.env, TZ: 'America/New_York' },
    });

    assert.deepEqual(JSON.parse(String(output)), [100, 101, 101]);
  });

  it('knows a day has ended only once its last hour is over', function () {
    sinon.useFakeTimers(new Date('2026-10-21T10:30:00Z').getTime());

    assert.equal(hasDayEnded('2026-10-20', 'UTC'), true);
    assert.equal(hasDayEnded('2026-10-21', 'UTC'), false);
    // Already the 22nd in Kiritimati (UTC+14)
    assert.equal(hasDayEnded('2026-10-21', 'Pacific/Kiritimati'), true);
  });

  it('labels hours in the given timezone', function () {
    sinon.useFakeTimers(new Date('2026-10-21T03:30:00Z').getTime());

    const { hours } = buildHourlyTotals({
      date: '2026-10-20',
      timezone: 'America/New_York',
      current: 11,
      // 20:15 in New York on the 20th
      events: [{ created_at: new Date('2026-10-21T00:15:00Z'), delta: 1 }],
      apply,
    });

    assert.equal(hours.length, 24);
    assert.equal(hours[0].date, '2026-10-20T00:00');
    assert.equal(hours[19].totals, 10);
    assert.equal(hours[20].totals, 11);
  });

  it('starts a past day where it began, undoing changes made since', function () {
    sinon.useFakeTimers(new Date('2026-10-21T12:00:00Z').getTime());

    const { hours, start } = buildHourlyTotals({
      date: '2026-10-20',
      timezone: 'UTC',
      current: 50,
      events: [
        { created_at: new Date('2026-10-20T09:00:00Z'), delta: 2 },
        // The next day's change is undone but not replayed
        { created_at: new Date('2026-10-21T09:00:00Z'), delta: 5 },
      ],
      apply,
    });

    assert.equal(start, 43);
    assert.equal(hours.length, 24);
    assert.equal(hours[23].totals, 45);
  });

  it('adds up UTC hours into the viewer’s local days', function () {
    const rows = [
      // 23:00 UTC on the 20th is 00:00 on the 21st in Lisbon (summer time)
      { hour: '2026-10-20 23:00:00', currency: 'usd', delta: 5 },
      { hour: '2026-10-21 10:00:00', currency: 'usd', delta: 2 },
      { hour: '2026-10-21 10:00:00', currency: 'eur', delta: 1 },
      // 01:00 UTC on the 22nd is still the 21st in New York
      { hour: '2026-10-22 01:00:00', currency: 'usd', delta: 4 },
    ];

    assert.deepEqual(sumByLocalDay(rows, 'Europe/Lisbon', ['delta'], ['currency']), [
      { date: '2026-10-21', currency: 'usd', delta: 7 },
      { date: '2026-10-21', currency: 'eur', delta: 1 },
      { date: '2026-10-22', currency: 'usd', delta: 4 },
    ]);
    assert.deepEqual(sumByLocalDay(rows, 'America/New_York', ['delta'], ['currency']), [
      { date: '2026-10-20', currency: 'usd', delta: 5 },
      { date: '2026-10-21', currency: 'usd', delta: 6 },
      { date: '2026-10-21', currency: 'eur', delta: 1 },
    ]);
  });

  it('groups by quarter hour only for timezones whose days start part-way through an hour', function () {
    const mysql = { client: { config: { client: 'mysql2' } } };
    const sqlite = { client: { config: { client: 'sqlite3' } } };

    for (const timezone of ['UTC', 'Europe/Lisbon', 'America/New_York']) {
      assert.doesNotMatch(utcBucketExpression(mysql, 'created_at', timezone), /MINUTE/);
    }
    for (const timezone of ['Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Adelaide']) {
      assert.match(utcBucketExpression(mysql, 'created_at', timezone), /MINUTE/);
      assert.match(utcBucketExpression(sqlite, 'created_at', timezone), /%M/);
    }
  });

  it('adds up quarter hours into local days', function () {
    // 18:30 UTC is midnight in India, so this quarter starts the next day there
    const rows = [
      { hour: '2026-10-20 18:15:00', delta: 1 },
      { hour: '2026-10-20 18:30:00', delta: 2 },
    ];
    assert.deepEqual(sumByLocalDay(rows, 'Asia/Kolkata', ['delta']), [
      { date: '2026-10-20', delta: 1 },
      { date: '2026-10-21', delta: 2 },
    ]);
  });

  it('finds the start of a day in UTC for the query', function () {
    assert.equal(dayStartUtc('2026-10-21', 'Europe/Lisbon'), '2026-10-20 23:00:00');
    assert.equal(dayStartUtc('2026-10-21', 'Not/AZone'), '2026-10-21 00:00:00');
  });
});
