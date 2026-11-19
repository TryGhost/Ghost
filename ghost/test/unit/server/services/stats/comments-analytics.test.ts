import assert from 'node:assert/strict';
import knex, { type Knex } from 'knex';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import {
  CommentsAnalyticsService,
  getCommentsStatsWindow,
  getInterval,
  parseCommentsStatsRange,
} from '../../../../../core/server/services/stats/comments-analytics';

const range = (date_from: string, date_to: string, timezone?: string) => ({
  date_from,
  date_to,
  ...(timezone ? { timezone } : {}),
});

const windowFor = (options: unknown, now?: number) => {
  const parsed = parseCommentsStatsRange(options);
  return getCommentsStatsWindow({ ...parsed, dateFrom: parsed.dateFrom! }, { now });
};

describe('getCommentsStatsWindow', function () {
  it('resolves local days to UTC across a DST change', function () {
    const window = windowFor(range('2026-10-18', '2026-11-16', 'America/New_York'));

    assert.equal(window.interval, 'day');
    assert.equal(window.from, '2026-10-18 04:00:00');
    assert.equal(window.to, '2026-11-17 05:00:00');
    assert.equal(window.previousFrom, '2026-09-18 04:00:00');
    assert.equal(window.previousTo, '2026-10-18 04:00:00');
    assert.equal(window.buckets.length, 30);
    assert.deepEqual(
      window.buckets.filter(({ date }) => date >= '2026-11-01' && date <= '2026-11-02'),
      [
        { date: '2026-11-01', start: '2026-11-01 04:00:00' },
        { date: '2026-11-02', start: '2026-11-02 05:00:00' },
      ],
    );
  });

  it('ends the previous period at the same elapsed point while the range runs', function () {
    const options = range('2026-11-01', '2026-11-03', 'Asia/Tokyo');

    // Noon on Nov 2 in Tokyo, 36 hours into the range
    const running = windowFor(options, Date.parse('2026-11-02T03:00:00Z'));
    assert.equal(running.previousFrom, '2026-10-28 15:00:00');
    assert.equal(running.previousTo, '2026-10-30 03:00:00');

    const notStarted = windowFor(options, Date.parse('2026-10-31T00:00:00Z'));
    assert.equal(notStarted.previousTo, notStarted.previousFrom);
  });

  it('handles half-hour UTC offsets', function () {
    const window = windowFor(range('2026-11-01', '2026-11-02', 'Asia/Kolkata'));

    assert.equal(window.from, '2026-10-31 18:30:00');
    assert.equal(window.to, '2026-11-02 18:30:00');
    assert.equal(window.buckets[1].start, '2026-11-01 18:30:00');
  });

  it('starts a day at the DST transition when midnight is skipped', function () {
    const window = windowFor(range('2026-09-05', '2026-09-07', 'America/Santiago'));

    assert.deepEqual(
      window.buckets.map(({ start }) => start),
      ['2026-09-05 04:00:00', '2026-09-06 04:00:00', '2026-09-07 03:00:00'],
    );
  });

  it('starts a day at the first midnight when DST repeats midnight', function () {
    const window = windowFor(range('2021-10-29', '2021-10-29', 'Asia/Amman'));

    assert.equal(window.from, '2021-10-28 21:00:00');
  });

  it('defaults to UTC', function () {
    const window = windowFor(range('2026-11-01', '2026-11-03'));

    assert.equal(window.from, '2026-11-01 00:00:00');
    assert.equal(window.to, '2026-11-04 00:00:00');
    assert.equal(window.previousFrom, '2026-10-29 00:00:00');
  });

  it('starts weekly buckets on date_from, then on Sundays', function () {
    const window = windowFor(range('2026-08-19', '2026-11-16', 'Europe/London'));

    assert.equal(window.interval, 'week');
    assert.equal(window.buckets[0].date, '2026-08-19');
    for (const { date } of window.buckets.slice(1)) {
      assert.equal(new Date(`${date}T00:00:00Z`).getUTCDay(), 0, `${date} is not a Sunday`);
    }
    assert.equal(window.buckets.at(-1)!.date, '2026-11-15');
  });

  it('starts monthly buckets on date_from, then on the first of each month', function () {
    const window = windowFor(range('2024-02-22', '2026-11-17', 'UTC'));

    assert.equal(window.interval, 'month');
    assert.equal(window.buckets[0].date, '2024-02-22');
    assert.equal(window.buckets[1].date, '2024-03-01');
    assert.equal(window.buckets.at(-1)!.date, '2026-11-01');
    assert.equal(window.buckets.length, 34);
  });

  it('leaves the previous period empty when told not to compare', function () {
    const window = getCommentsStatsWindow(
      { dateFrom: '2026-11-01', dateTo: '2026-11-03', timezone: 'UTC' },
      { comparePrevious: false },
    );

    assert.equal(window.previousFrom, window.from);
    assert.equal(window.previousTo, window.from);
  });

  it('accepts a date_to of tomorrow, which is already today in some timezones', function () {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse('2026-11-17T23:00:00Z') });
    try {
      assert.equal(parseCommentsStatsRange({ date_to: '2026-11-18' }).dateTo, '2026-11-18');
      assert.throws(() => parseCommentsStatsRange({ date_to: '2026-11-19' }), {
        errorType: 'ValidationError',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts a range without date_from', function () {
    assert.deepEqual(parseCommentsStatsRange({ date_to: '2026-11-03' }), {
      dateFrom: null,
      dateTo: '2026-11-03',
      timezone: 'UTC',
    });
  });

  it('uses the same interval bands as Admin charts', function () {
    assert.equal(getInterval(89), 'day');
    assert.equal(getInterval(90), 'week');
    assert.equal(getInterval(270), 'week');
    assert.equal(getInterval(271), 'month');
  });

  for (const [name, options] of [
    ['a missing date_to', { date_from: '2026-11-01' }],
    ['an invalid date', range('2026-11-31', '2026-12-01')],
    ['a reversed range', range('2026-11-02', '2026-11-01')],
    ['an unknown timezone', range('2026-11-01', '2026-11-02', 'Mars/Olympus')],
    ['a range over 3660 days', range('2016-01-01', '2026-11-01')],
    ['a date_to after tomorrow', { date_to: '9999-12-31' }],
    ['a range ending after tomorrow', range('9999-12-01', '9999-12-31')],
  ] as const) {
    it(`rejects ${name}`, function () {
      assert.throws(() => parseCommentsStatsRange(options), { errorType: 'ValidationError' });
    });
  }
});

describe('CommentsAnalyticsService', function () {
  let db: Knex;
  let service: CommentsAnalyticsService;

  const comment = (
    id: string,
    postId: string,
    memberId: string | null,
    createdAt: string,
    status = 'published',
  ) => ({ id, post_id: postId, member_id: memberId, status, created_at: createdAt });

  beforeEach(async function () {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.schema.createTable('posts', (table) => {
      table.string('id').primary();
      table.string('title');
    });
    await db.schema.createTable('members', (table) => {
      table.string('id').primary();
      table.string('name').nullable();
      table.string('email');
    });
    await db.schema.createTable('comments', (table) => {
      table.string('id').primary();
      table.string('post_id');
      table.string('member_id').nullable();
      table.string('status');
      table.text('html').defaultTo('<p>A comment</p>');
      table.dateTime('created_at');
    });
    await db.schema.createTable('comment_reports', (table) => {
      table.string('id').primary();
      table.string('comment_id');
    });

    await db('posts').insert([
      { id: 'post_a', title: 'Post A' },
      { id: 'post_b', title: 'Post B' },
    ]);
    await db('members').insert([
      { id: 'member_1', name: 'Ann', email: 'ann@example.com' },
      { id: 'member_2', name: null, email: 'nameless@example.com' },
      { id: 'member_3', name: 'Cal', email: 'cal@example.com' },
    ]);
    await db('comments').insert([
      comment('c1', 'post_a', 'member_1', '2026-11-01 10:00:00'),
      comment('c2', 'post_a', 'member_2', '2026-11-01 11:00:00', 'hidden'),
      comment('c3', 'post_a', 'member_1', '2026-11-02 10:00:00', 'deleted'),
      comment('c4', 'post_b', 'member_1', '2026-11-03 23:59:59'),
      comment('c5', 'post_b', null, '2026-11-02 12:00:00'),
      comment('c6', 'post_a', 'member_3', '2026-11-04 00:00:00'),
      comment('c7', 'post_b', 'member_2', '2026-10-30 08:00:00'),
      comment('c8', 'post_a', 'member_3', '2026-10-28 23:59:59'),
    ]);
    await db('comment_reports').insert([
      { id: 'r1', comment_id: 'c2' },
      { id: 'r2', comment_id: 'c2' },
      { id: 'r3', comment_id: 'c3' },
      { id: 'r4', comment_id: 'c6' },
      { id: 'r5', comment_id: 'c7' },
    ]);

    service = new CommentsAnalyticsService({ knex: db });
  });

  afterEach(async function () {
    await db.destroy();
  });

  it('counts published and hidden comments in the range, and the previous period', async function () {
    const overview = await service.getOverview(range('2026-11-01', '2026-11-03'));

    assert.deepEqual(overview, {
      totals: { comments: 4, commenters: 2, reported: 1 },
      previous_totals: { comments: 1, commenters: 1, reported: 1 },
      interval: 'day',
      series: [
        { date: '2026-11-01', comments: 2, commenters: 2, reported: 1 },
        { date: '2026-11-02', comments: 1, commenters: 0, reported: 0 },
        { date: '2026-11-03', comments: 1, commenters: 1, reported: 0 },
      ],
    });
  });

  it('applies the same combined filter to totals, comparisons, series and both rankings', async function () {
    const options = {
      ...range('2026-11-01', '2026-11-03'),
      filter: 'post_id:post_b+member_id:member_2+status:published+count.reports:>0',
    };
    const overview = await service.getOverview(options);

    assert.deepEqual(overview.totals, { comments: 0, commenters: 0, reported: 0 });
    assert.deepEqual(overview.previous_totals, { comments: 1, commenters: 1, reported: 1 });
    assert.ok(
      overview.series.every(
        ({ comments, commenters, reported }) =>
          comments === 0 && commenters === 0 && reported === 0,
      ),
    );
    assert.deepEqual((await service.getTopPosts(options)).data, []);
    assert.deepEqual((await service.getTopCommenters(options)).data, []);

    const matching = { ...options, filter: 'post_id:post_a+member_id:member_2+count.reports:>0' };
    assert.deepEqual((await service.getOverview(matching)).totals, {
      comments: 1,
      commenters: 1,
      reported: 1,
    });
    assert.deepEqual((await service.getTopPosts(matching)).data, [
      { post_id: 'post_a', title: 'Post A', comments: 1 },
    ]);
    assert.deepEqual((await service.getTopCommenters(matching)).data, [
      { member_id: 'member_2', name: null, comments: 1 },
    ]);
  });

  it('preserves grouped OR filters without allowing deleted comments or dates outside the range', async function () {
    const overview = await service.getOverview({
      ...range('2026-11-01', '2026-11-03'),
      filter: '(post_id:post_a+status:hidden),member_id:member_1',
    });

    assert.deepEqual(overview.totals, { comments: 3, commenters: 2, reported: 1 });
    assert.deepEqual(overview.previous_totals, { comments: 0, commenters: 0, reported: 0 });
    assert.deepEqual(
      overview.series.map(({ comments }) => comments),
      [2, 0, 1],
    );
  });

  it('supports negative post/author filters and comments with no reports', async function () {
    const options = {
      ...range('2026-11-01', '2026-11-03'),
      filter: 'post_id:-post_a+member_id:-member_2+count.reports:0',
    };
    assert.deepEqual((await service.getOverview(options)).totals, {
      comments: 1,
      commenters: 1,
      reported: 0,
    });
    assert.deepEqual((await service.getTopPosts(options)).data, [
      { post_id: 'post_b', title: 'Post B', comments: 1 },
    ]);
  });

  it('uses the comments list NQL text matching semantics, including literal wildcard characters', async function () {
    await db('comments').where('id', 'c1').update({ html: '<p>100%_done</p>' });
    await db('comments').where('id', 'c4').update({ html: '<p>100xxdone</p>' });
    const options = { ...range('2026-11-01', '2026-11-03'), filter: "html:~'100%_done'" };

    assert.deepEqual((await service.getOverview(options)).totals, {
      comments: 1,
      commenters: 1,
      reported: 0,
    });
    assert.deepEqual((await service.getTopCommenters(options)).data, [
      { member_id: 'member_1', name: 'Ann', comments: 1 },
    ]);
  });

  it('starts All time on the first matching comment and returns one zero bucket when none match', async function () {
    const overview = await service.getOverview({ date_to: '2026-11-03', filter: 'status:hidden' });
    assert.equal(overview.series[0].date, '2026-11-01');
    assert.deepEqual(overview.totals, { comments: 1, commenters: 1, reported: 1 });

    const empty = await service.getOverview({ date_to: '2026-11-03', filter: 'post_id:missing' });
    assert.deepEqual(empty.series, [
      { date: '2026-11-03', comments: 0, commenters: 0, reported: 0 },
    ]);
  });

  for (const filter of [
    'members.email:~secret',
    'id:c1',
    '(post_id:post_a),unknown:value',
    'count.reports:~hello',
    'post_id:(',
  ]) {
    it(`rejects unsupported or malformed filter ${filter}`, async function () {
      const options = { ...range('2026-11-01', '2026-11-03'), filter };
      for (const query of [
        () => service.getOverview(options),
        () => service.getTopPosts(options),
        () => service.getTopCommenters(options),
      ]) {
        await assert.rejects(async () => query(), {
          errorType: 'ValidationError',
        });
      }
    });
  }

  it('compares a running range with the same part of the previous period', async function () {
    await db('comment_reports').insert({ id: 'r6', comment_id: 'c4' });
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse('2026-11-04T06:00:00Z') });

    try {
      const overview = await service.getOverview(range('2026-11-04', '2026-11-04'));

      // c4 (Nov 3 23:59 UTC) is later in the previous day than now is in today
      assert.deepEqual(overview.totals, { comments: 1, commenters: 1, reported: 1 });
      assert.deepEqual(overview.previous_totals, { comments: 0, commenters: 0, reported: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('buckets by the site timezone', async function () {
    const overview = await service.getOverview(range('2026-11-01', '2026-11-03', 'Asia/Tokyo'));

    // c4 (Nov 3 23:59 UTC) is Nov 4 in Tokyo; c6 (Nov 4 00:00 UTC) is Nov 4 too
    assert.deepEqual(
      overview.series.map(({ date, comments }) => [date, comments]),
      [
        ['2026-11-01', 2],
        ['2026-11-02', 1],
        ['2026-11-03', 0],
      ],
    );
  });

  it('counts commenters once per bucket and once overall', async function () {
    const overview = await service.getOverview(range('2026-08-01', '2026-11-03'));

    assert.equal(overview.interval, 'week');
    assert.deepEqual(overview.totals, { comments: 6, commenters: 3, reported: 2 });
    assert.deepEqual(overview.series.at(-1), {
      date: '2026-11-01',
      comments: 4,
      commenters: 2,
      reported: 1,
    });
    assert.equal(
      overview.series.reduce((sum, { comments }) => sum + comments, 0),
      overview.totals.comments,
    );
  });

  it('starts an unbounded range on the first comment, with nothing to compare', async function () {
    const overview = await service.getOverview({ date_to: '2026-11-03', timezone: 'Asia/Tokyo' });

    // c8 (Oct 28 23:59 UTC) is Oct 29 in Tokyo; deleted comments do not count
    assert.equal(overview.interval, 'day');
    assert.equal(overview.series[0].date, '2026-10-29');
    assert.equal(overview.series.at(-1)!.date, '2026-11-03');
    assert.deepEqual(overview.totals, { comments: 5, commenters: 3, reported: 2 });
    assert.deepEqual(overview.previous_totals, { comments: 0, commenters: 0, reported: 0 });
  });

  it('starts an unbounded range no more than 3660 days back', async function () {
    await db('comments').insert(comment('c_old', 'post_a', 'member_1', '2005-06-01 12:00:00'));

    const overview = await service.getOverview({ date_to: '2026-11-03' });
    const { data } = await service.getTopCommenters({ date_to: '2026-11-03' });

    // The 2005 comment is ignored rather than stretching the chart over 21 years
    assert.equal(overview.interval, 'day');
    assert.equal(overview.series[0].date, '2026-10-28');
    assert.equal(overview.totals.comments, 6);
    assert.equal(data.find(({ member_id: id }) => id === 'member_1')?.comments, 2);
  });

  it('returns one empty bucket for an unbounded range with no comments', async function () {
    await db('comment_reports').del();
    await db('comments').del();

    const overview = await service.getOverview({ date_to: '2026-11-03' });

    assert.deepEqual(overview.series, [
      { date: '2026-11-03', comments: 0, commenters: 0, reported: 0 },
    ]);
  });

  it('ranks over every comment when the range is unbounded', async function () {
    const { data } = await service.getTopCommenters({ date_to: '2026-11-03' });

    assert.deepEqual(data, [
      { member_id: 'member_1', name: 'Ann', comments: 2 },
      { member_id: 'member_2', name: null, comments: 2 },
      { member_id: 'member_3', name: 'Cal', comments: 1 },
    ]);
  });

  it('ranks posts by comments, breaking ties by id', async function () {
    const { data } = await service.getTopPosts(range('2026-11-01', '2026-11-03'));

    assert.deepEqual(data, [
      { post_id: 'post_a', title: 'Post A', comments: 2 },
      { post_id: 'post_b', title: 'Post B', comments: 2 },
    ]);
  });

  it('ranks commenters by comments without exposing email', async function () {
    const { data } = await service.getTopCommenters(range('2026-11-01', '2026-11-03'));

    assert.deepEqual(data, [
      { member_id: 'member_1', name: 'Ann', comments: 2 },
      { member_id: 'member_2', name: null, comments: 1 },
    ]);
  });

  it('applies the limit', async function () {
    const { data } = await service.getTopCommenters({
      ...range('2026-11-01', '2026-11-03'),
      limit: '1',
    });

    assert.equal(data.length, 1);
  });

  it('returns the top 25 by default and more on request', async function () {
    const extraPosts = Array.from({ length: 40 }, (_, index) => ({
      id: `post_${String(index).padStart(2, '0')}`,
      title: `Post ${index}`,
    }));
    await db('posts').insert(extraPosts);
    await db('comments').insert(
      extraPosts.map(({ id }, index) =>
        comment(`cx${index}`, id, 'member_1', '2026-11-02 09:00:00'),
      ),
    );
    const options = range('2026-11-01', '2026-11-03');

    assert.equal((await service.getTopPosts(options)).data.length, 25);
    assert.equal((await service.getTopPosts({ ...options, limit: '100' })).data.length, 42);
  });

  for (const limit of ['0', '-1', 'all']) {
    it(`rejects limit=${limit}`, async function () {
      await assert.rejects(service.getTopPosts({ ...range('2026-11-01', '2026-11-03'), limit }), {
        errorType: 'ValidationError',
      });
    });
  }
});
