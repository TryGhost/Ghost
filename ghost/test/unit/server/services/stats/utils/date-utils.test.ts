import assert from 'node:assert/strict';
import knex, { type Knex } from 'knex';

const {
  getDateBoundaries,
  applyDateFilter,
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
