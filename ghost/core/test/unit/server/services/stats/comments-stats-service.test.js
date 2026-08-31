const assert = require('node:assert/strict');
const sinon = require('sinon');
const knexLib = require('knex');
const CommentsStatsService = require('../../../../../core/server/services/stats/comments-stats-service');
const { getDateBoundaries } = require('../../../../../core/server/services/stats/utils/date-utils');

function makeQB(resultFn) {
  const qb = {};
  const chainable = [
    'select',
    'where',
    'whereIn',
    'whereNotNull',
    'whereExists',
    'count',
    'countDistinct',
    'groupBy',
    'groupByRaw',
    'orderBy',
    'orderByRaw',
    'limit',
    'join',
  ];
  for (const method of chainable) {
    qb[method] = sinon.stub().returns(qb);
  }
  qb.then = (resolve, reject) => Promise.resolve(resultFn(qb)).then(resolve, reject);
  qb.catch = (fn) => Promise.resolve(resultFn(qb)).catch(fn);
  return qb;
}

function createService({ tableResults = {} } = {}) {
  const captured = {};
  const knex = sinon.stub().callsFake((table) => {
    const handler = tableResults[table];
    if (!handler) {
      throw new Error(`Unexpected knex table "${table}" in test`);
    }
    const qbs = (captured[table] = captured[table] || []);
    const qb = makeQB((builder) => handler(builder, qbs.length));
    qbs.push(qb);
    return qb;
  });
  knex.raw = sinon.stub().callsFake((v) => v);
  knex.client = { config: { client: 'mysql2' } };

  return {
    service: new CommentsStatsService({ knex }),
    knex,
    captured,
  };
}

function commentsHandler({
  totals,
  series = [],
  reportedTotals,
  reportedSeries = [],
  posts = [],
  members = [],
}) {
  return (builder) => {
    if (builder.groupByRaw.called) {
      return builder.whereExists.called ? reportedSeries : series;
    }
    if (builder.join.called) {
      const joinArgs = builder.join.firstCall.args;
      if (joinArgs[0] === 'posts') {
        return posts;
      }
      if (joinArgs[0] === 'members') {
        return members;
      }
    }
    if (builder.whereExists.called) {
      return [reportedTotals];
    }
    return [totals];
  };
}

describe('CommentsStatsService', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('getOverview', function () {
    it('returns zeroed snake_case shape when DB has no matching rows', async function () {
      const { service } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: 0, commenters: 0 },
            reportedTotals: { reported: 0 },
          }),
        },
      });

      const result = await service.getOverview({
        date_from: '2026-01-01',
        date_to: '2026-01-31',
      });

      assert.deepEqual(result.totals, {
        comments: 0,
        commenters: 0,
        reported: 0,
      });
      assert.deepEqual(result.series, []);
      assert.equal(result.series_aggregation, 'day');
      assert.deepEqual(result.top_posts, []);
      assert.deepEqual(result.top_members, []);
    });

    it('maps aggregate rows into the expected shape', async function () {
      const { service } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: '42', commenters: '11' },
            reportedTotals: { reported: '3' },
            series: [
              { date: '2026-01-10', count: '5', commenters: '4' },
              { date: '2026-01-11', count: '7', commenters: '5' },
            ],
            reportedSeries: [{ date: '2026-01-11', reported: '2' }],
            posts: [
              { id: 'post-1', title: 'Post One', slug: 'post-one', count: '20' },
              { id: 'post-2', title: 'Post Two', slug: 'post-two', count: '15' },
            ],
            members: [
              { id: 'mem-1', name: 'Alice', count: '12' },
              { id: 'mem-2', name: 'Bob', count: '9' },
            ],
          }),
        },
      });

      const result = await service.getOverview({
        date_from: '2026-01-01',
        date_to: '2026-01-31',
      });

      assert.deepEqual(result.totals, {
        comments: 42,
        commenters: 11,
        reported: 3,
      });
      assert.equal(result.series.length, 31);
      assert.deepEqual(result.series.slice(9, 11), [
        { date: '2026-01-10', count: 5, commenters: 4, reported: 0 },
        { date: '2026-01-11', count: 7, commenters: 5, reported: 2 },
      ]);
      assert.deepEqual(result.series[0], {
        date: '2026-01-01',
        count: 0,
        commenters: 0,
        reported: 0,
      });
      assert.equal(result.series_aggregation, 'day');
      assert.deepEqual(result.top_posts[0], {
        id: 'post-1',
        title: 'Post One',
        slug: 'post-one',
        count: 20,
      });
      assert.deepEqual(result.top_members[0], {
        id: 'mem-1',
        name: 'Alice',
        count: 12,
      });
    });

    it('never exposes member email in top_members', async function () {
      const { service, captured } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: 0, commenters: 0 },
            reportedTotals: { reported: 0 },
            members: [{ id: 'mem-1', name: 'Alice', email: 'a@example.com', count: '12' }],
          }),
        },
      });

      const result = await service.getOverview({
        date_from: '2026-01-01',
        date_to: '2026-01-31',
      });

      for (const member of result.top_members) {
        assert.ok(!('email' in member), 'top_members rows must not carry member email');
      }

      const membersQuery = captured.comments.find((qb) => qb.join.called);
      const selected = membersQuery.select.firstCall.args;
      assert.ok(
        !selected.some((column) => String(column).includes('email')),
        'members query must not select an email column',
      );
    });

    it('counts reported comments by comment created_at, not report created_at', async function () {
      const { service, captured } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: 0, commenters: 0 },
            reportedTotals: { reported: '4' },
            series: [],
            reportedSeries: [{ date: '2026-02-01', reported: '4' }],
          }),
        },
      });

      const result = await service.getOverview({});

      assert.deepEqual(result.series, [
        { date: '2026-02-01', count: 0, commenters: 0, reported: 4 },
      ]);
      assert.equal(result.series_aggregation, 'month');
      assert.equal(captured.comment_reports, undefined);
    });

    it('returns previous_totals for the equivalent prior window when both bounds are set', async function () {
      const isCurrentRange = (builder) => {
        const fromCall = builder.where.getCalls().find((call) => call.args[1] === '>=');
        if (!fromCall) {
          return false;
        }
        return fromCall.args[2] === '2026-02-08T00:00:00.000Z';
      };

      const { service } = createService({
        tableResults: {
          comments: (builder) => {
            if (builder.groupByRaw.called || builder.join.called) {
              return [];
            }
            if (builder.whereExists.called) {
              return isCurrentRange(builder) ? [{ reported: '6' }] : [{ reported: '3' }];
            }
            return isCurrentRange(builder)
              ? [{ count: '40', commenters: '15' }]
              : [{ count: '20', commenters: '8' }];
          },
        },
      });

      const result = await service.getOverview({
        date_from: '2026-02-08',
        date_to: '2026-02-14',
      });

      assert.deepEqual(result.totals, { comments: 40, commenters: 15, reported: 6 });
      assert.deepEqual(result.previous_totals, { comments: 20, commenters: 8, reported: 3 });
    });

    it('interprets date bounds in the requested timezone', async function () {
      const recordedBounds = [];
      const { service } = createService({
        tableResults: {
          comments: (builder) => {
            if (builder.groupByRaw.called || builder.join.called || builder.whereExists.called) {
              return builder.whereExists.called && !builder.groupByRaw.called
                ? [{ reported: 0 }]
                : [];
            }
            const from = builder.where.getCalls().find((c) => c.args[1] === '>=')?.args[2];
            const to = builder.where.getCalls().find((c) => c.args[1] === '<=')?.args[2];
            recordedBounds.push({ from, to });
            return [{ count: 0, commenters: 0 }];
          },
        },
      });

      await service.getOverview({
        date_from: '2026-02-08',
        date_to: '2026-02-08',
        timezone: 'America/Los_Angeles',
      });

      const currentBounds = recordedBounds.find((b) => b.from === '2026-02-08T08:00:00.000Z');
      assert.ok(currentBounds, 'expected current range lower bound at PST start-of-day in UTC');
      assert.equal(currentBounds.to, '2026-02-09T07:59:59.999Z');
    });

    it('returns previous_totals = null when range has no bounds', async function () {
      const { service } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: 0, commenters: 0 },
            reportedTotals: { reported: 0 },
          }),
        },
      });

      const result = await service.getOverview({});

      assert.equal(result.previous_totals, null);
    });

    it('formats Date instances in series rows into YYYY-MM-DD strings', async function () {
      const { service } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: 0, commenters: 0 },
            reportedTotals: { reported: 0 },
            series: [{ date: new Date('2026-03-01T00:00:00.000Z'), count: 4, commenters: 3 }],
          }),
        },
      });

      const result = await service.getOverview({});

      assert.deepEqual(result.series, [
        { date: '2026-03-01', count: 4, commenters: 3, reported: 0 },
      ]);
    });

    it('returns true distinct commenter counts in server-side weekly buckets', async function () {
      const { service, captured } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: 30, commenters: 9 },
            reportedTotals: { reported: 0 },
            series: [{ date: '2026-01-05', count: 20, commenters: 9 }],
          }),
        },
      });

      const result = await service.getOverview({
        date_from: '2026-01-01',
        date_to: '2026-04-01',
      });

      assert.equal(result.series_aggregation, 'week');
      assert.deepEqual(
        result.series.find((row) => row.date === '2026-01-05'),
        { date: '2026-01-05', count: 20, commenters: 9, reported: 0 },
      );

      const seriesQuery = captured.comments.find(
        (qb) => qb.groupByRaw.called && !qb.whereExists.called,
      );
      assert.deepEqual(seriesQuery.countDistinct.firstCall.args, [{ commenters: 'member_id' }]);
    });

    it('keeps every bucket when the range crosses a DST change', async function () {
      // Buckets are computed in SQL with a single offset sampled at request
      // time (+10:00 here), while the range bounds are DST-aware for January
      // (+11:00). A comment just after the range opens buckets to 2025-12-31,
      // one day before the DST-aware range start, so the fill window has to be
      // built from the sampled offset or that bucket disappears.
      sinon.useFakeTimers({ now: Date.parse('2026-08-15T00:00:00.000Z'), toFake: ['Date'] });

      const { service } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: '9', commenters: '3' },
            reportedTotals: { reported: 0 },
            series: [
              { date: '2025-12-31', count: '7', commenters: '2' },
              { date: '2026-01-15', count: '2', commenters: '1' },
            ],
          }),
        },
      });

      const result = await service.getOverview({
        date_from: '2026-01-01',
        date_to: '2026-01-31',
        timezone: 'Australia/Sydney',
      });

      const seriesTotal = result.series.reduce((sum, row) => sum + row.count, 0);
      assert.equal(
        seriesTotal,
        result.totals.comments,
        'series must account for every comment counted in the KPI',
      );
      assert.deepEqual(
        result.series.find((row) => row.date === '2025-12-31'),
        { date: '2025-12-31', count: 7, commenters: 2, reported: 0 },
      );
    });

    it('merges buckets the fill window would otherwise drop', async function () {
      const { service } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: '5', commenters: '2' },
            reportedTotals: { reported: 0 },
            series: [
              { date: '2025-06-01', count: '4', commenters: '1' },
              { date: '2026-01-02', count: '1', commenters: '1' },
            ],
          }),
        },
      });

      const result = await service.getOverview({
        date_from: '2026-01-01',
        date_to: '2026-01-03',
      });

      assert.deepEqual(result.series, [
        { date: '2025-06-01', count: 4, commenters: 1, reported: 0 },
        { date: '2026-01-01', count: 0, commenters: 0, reported: 0 },
        { date: '2026-01-02', count: 1, commenters: 1, reported: 0 },
        { date: '2026-01-03', count: 0, commenters: 0, reported: 0 },
      ]);
    });

    it('applies whereIn published+hidden on totals queries', async function () {
      const { service, captured } = createService({
        tableResults: {
          comments: commentsHandler({
            totals: { count: 1, commenters: 1 },
            reportedTotals: { reported: 0 },
          }),
        },
      });

      await service.getOverview({ date_from: '2026-01-01', date_to: '2026-01-31' });

      const totalsQuery = captured.comments.find(
        (qb) => !qb.groupByRaw.called && !qb.join.called && !qb.whereExists.called,
      );
      assert.ok(totalsQuery.whereIn.called);
      assert.deepEqual(totalsQuery.whereIn.firstCall.args[1], ['published', 'hidden']);
    });
  });

  describe('SQLite bucket queries', function () {
    it('executes day and week buckets with a non-UTC half-hour offset', async function () {
      const knex = knexLib({
        client: 'better-sqlite3',
        connection: { filename: ':memory:' },
        useNullAsDefault: true,
      });
      const service = new CommentsStatsService({ knex });

      try {
        await knex.schema.createTable('comments', (table) => {
          table.string('id').primary();
          table.string('member_id');
          table.string('status');
          table.dateTime('created_at');
        });
        await knex.schema.createTable('comment_reports', (table) => {
          table.string('comment_id');
        });
        await knex('comments').insert([
          {
            id: 'comment-1',
            member_id: 'member-1',
            status: 'published',
            created_at: '2026-01-04 19:00:00',
          },
          {
            id: 'comment-2',
            member_id: 'member-1',
            status: 'published',
            created_at: '2026-01-06 00:00:00',
          },
          {
            id: 'comment-3',
            member_id: 'member-2',
            status: 'published',
            created_at: '2026-01-11 18:45:00',
          },
        ]);

        const dayRange = getDateBoundaries({
          date_from: '2026-01-01',
          date_to: '2026-01-30',
          timezone: 'Asia/Kolkata',
        });
        const daySeries = await service._getSeries(knex, dayRange, 'Asia/Kolkata', 'day');
        assert.deepEqual(
          daySeries.filter((row) => row.count > 0),
          [
            { date: '2026-01-05', count: 1, commenters: 1, reported: 0 },
            { date: '2026-01-06', count: 1, commenters: 1, reported: 0 },
            { date: '2026-01-12', count: 1, commenters: 1, reported: 0 },
          ],
        );

        const weekRange = getDateBoundaries({
          date_from: '2026-01-01',
          date_to: '2026-04-30',
          timezone: 'Asia/Kolkata',
        });
        const weekSeries = await service._getSeries(knex, weekRange, 'Asia/Kolkata', 'week');
        assert.deepEqual(
          weekSeries.filter((row) => row.count > 0),
          [
            { date: '2026-01-05', count: 2, commenters: 1, reported: 0 },
            { date: '2026-01-12', count: 1, commenters: 1, reported: 0 },
          ],
        );
      } finally {
        await knex.destroy();
      }
    });
  });
});
