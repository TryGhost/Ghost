import assert from 'node:assert/strict';
import knex, { type Knex } from 'knex';
import { mockSystemTime } from '../../../../../utils/clock-utils';

const {
  getDateBoundaries,
  applyDateFilter,
  utcToday,
  startOfUtcDayAgo,
} = require('../../../../../../core/server/services/stats/utils/date-utils');

describe('Stats date utils', function () {
  describe('getDateBoundaries', function () {
    it('spans each calendar day in the given timezone, expressed as UTC instants', function () {
      // Daylight saving time begins in New York on 10 March 2024, so the day
      // starts five hours behind UTC and ends four hours behind it.
      const boundaries = getDateBoundaries({
        date_from: '2024-03-10',
        date_to: '2024-03-10',
        timezone: 'America/New_York',
      });

      assert.deepEqual(boundaries, {
        dateFrom: '2024-03-10T05:00:00.000Z',
        dateTo: '2024-03-11T03:59:59.999Z',
      });
    });

    it('interprets dates in UTC when no timezone is given', function () {
      const boundaries = getDateBoundaries({ date_from: '2024-03-10', date_to: '2024-03-12' });

      assert.deepEqual(boundaries, {
        dateFrom: '2024-03-10T00:00:00.000Z',
        dateTo: '2024-03-12T23:59:59.999Z',
      });
    });

    it('returns null for each missing bound', function () {
      assert.deepEqual(getDateBoundaries({}), { dateFrom: null, dateTo: null });
      assert.deepEqual(getDateBoundaries({ date_to: '2024-03-12', timezone: 'UTC' }), {
        dateFrom: null,
        dateTo: '2024-03-12T23:59:59.999Z',
      });
    });
  });

  describe('current-day helpers', function () {
    let clock: ReturnType<typeof mockSystemTime>;

    beforeEach(function () {
      // Late in the UTC day, so a local-time reading would already be tomorrow
      // in zones ahead of UTC.
      clock = mockSystemTime(new Date('2024-03-01T23:30:00.000Z'));
    });

    afterEach(function () {
      clock.restore();
    });

    it('reports today as the UTC calendar date', function () {
      assert.equal(utcToday(), '2024-03-01');
    });

    it('opens a window at the start of the UTC day the given number of days ago', function () {
      assert.equal(startOfUtcDayAgo(0), '2024-03-01 00:00:00');
      assert.equal(startOfUtcDayAgo(1), '2024-02-29 00:00:00');
      assert.equal(startOfUtcDayAgo(90), '2023-12-02 00:00:00');
    });
  });

  describe('applyDateFilter', function () {
    let db: Knex;

    beforeEach(function () {
      db = knex({
        client: 'better-sqlite3',
        useNullAsDefault: true,
        connection: { filename: ':memory:' },
      });
    });

    afterEach(async function () {
      await db.destroy();
    });

    it('adds inclusive bounds on the given column', function () {
      const query = db('events');

      applyDateFilter(query, '2024-03-10T00:00:00.000Z', '2024-03-12T23:59:59.999Z', 'created_at');

      assert.deepEqual(query.toSQL().toNative(), {
        sql: 'select * from `events` where `created_at` >= ? and `created_at` <= ?',
        bindings: ['2024-03-10T00:00:00.000Z', '2024-03-12T23:59:59.999Z'],
      });
    });

    it('skips a missing bound', function () {
      const lower = db('events');
      applyDateFilter(lower, '2024-03-10T00:00:00.000Z', null, 'published_at');
      assert.deepEqual(lower.toSQL().toNative(), {
        sql: 'select * from `events` where `published_at` >= ?',
        bindings: ['2024-03-10T00:00:00.000Z'],
      });

      const open = db('events');
      applyDateFilter(open, null, null, 'published_at');
      assert.deepEqual(open.toSQL().toNative(), { sql: 'select * from `events`', bindings: [] });
    });
  });
});
