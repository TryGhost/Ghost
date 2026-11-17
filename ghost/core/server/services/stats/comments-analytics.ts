import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';

export type CommentsInterval = 'day' | 'week' | 'month';

export type CommentsStatsWindow = {
  /** UTC datetimes as stored in the database; `to` is exclusive */
  from: string;
  to: string;
  previousFrom: string;
  interval: CommentsInterval;
  /** Ascending; `date` is the bucket's first local day, `start` its UTC start */
  buckets: { date: string; start: string }[];
};

type Totals = { comments: number; commenters: number; reported: number };

// Drivers return aggregates as numbers or numeric strings
type AggregateRow = Record<string, number | string>;

export type CommentsOverview = {
  totals: Totals;
  previous_totals: Totals;
  interval: CommentsInterval;
  series: ({ date: string } & Totals)[];
};

export type TopCommentedPost = { post_id: string; title: string; comments: number };
export type TopCommenter = { member_id: string; name: string | null; comments: number };

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 3660;
const MAX_TOP_LIMIT = 25;

const messages = {
  invalidOptions: 'Invalid comments stats options.',
  reversedDateRange: 'date_from must be on or before date_to.',
  rangeTooLong: `The date range must not exceed ${MAX_RANGE_DAYS} days.`,
};

function resolveTimezone(timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: timezone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

const timezoneSchema = z
  .string()
  .refine((value) => resolveTimezone(value) !== null, { abort: true })
  .transform((value) => resolveTimezone(value)!)
  .default('UTC');

const rangeSchema = z
  .object({
    date_from: z.iso.date(),
    date_to: z.iso.date(),
    timezone: timezoneSchema,
  })
  .superRefine((options, context) => {
    if (options.date_from > options.date_to) {
      context.addIssue({ code: 'custom', message: messages.reversedDateRange });
    } else if (rangeDays(options.date_from, options.date_to) > MAX_RANGE_DAYS) {
      context.addIssue({ code: 'custom', message: messages.rangeTooLong });
    }
  });

const topSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_TOP_LIMIT).default(MAX_TOP_LIMIT),
});

function parse<T extends z.ZodType>(schema: T, options: unknown): z.output<T> {
  const parsed = schema.safeParse(options ?? {});
  if (!parsed.success) {
    throw new errors.ValidationError({
      message: messages.invalidOptions,
      context: parsed.error.issues.map((issue) => issue.message).join(' '),
    });
  }
  return parsed.data;
}

// Calendar dates are YYYY-MM-DD strings, handled as UTC midnights
const dateMs = (date: string) => Date.parse(`${date}T00:00:00Z`);
const toDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => toDate(dateMs(date) + days * DAY_MS);

function rangeDays(dateFrom: string, dateTo: string) {
  return Math.round((dateMs(dateTo) - dateMs(dateFrom)) / DAY_MS) + 1;
}

// Same bands as Admin's getAggregationStrategy, so the chart never re-buckets
export function getInterval(days: number): CommentsInterval {
  if (days > 270) {
    return 'month';
  }
  if (days >= 90) {
    return 'week';
  }
  return 'day';
}

// Weeks start on Sunday, like moment's default locale that Admin charts use
function nextBucketDate(date: string, interval: CommentsInterval) {
  if (interval === 'day') {
    return addDays(date, 1);
  }
  if (interval === 'week') {
    return addDays(date, 7 - new Date(dateMs(date)).getUTCDay());
  }
  const [year, month] = date.split('-').map(Number);
  return toDate(Date.UTC(year, month, 1));
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string) {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timezone, formatter);
  }
  return formatter;
}

// Milliseconds the zone's wall clock is ahead of UTC at the given instant
function zoneOffset(instant: number, timezone: string) {
  const parts = getFormatter(timezone).formatToParts(instant);
  const part = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const wall = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );
  return wall - Math.floor(instant / 1000) * 1000;
}

// UTC datetime, as stored in the database, of the date's first local instant.
// Where DST skips midnight that is the transition; where it repeats, the first.
function startOfDay(date: string, timezone: string) {
  const midnight = dateMs(date);
  const instant = Math.min(
    ...[midnight - DAY_MS, midnight + DAY_MS]
      .map((probe) => midnight - zoneOffset(probe, timezone))
      .filter((candidate) => candidate + zoneOffset(candidate, timezone) >= midnight),
  );
  return new Date(instant).toISOString().slice(0, 19).replace('T', ' ');
}

// Inclusive site-local dates in; the previous period is the same number of
// local calendar days before date_from, so it stays aligned across DST.
export function getCommentsStatsWindow(options: unknown): CommentsStatsWindow {
  const { date_from: dateFrom, date_to: dateTo, timezone } = parse(rangeSchema, options);
  const days = rangeDays(dateFrom, dateTo);
  const interval = getInterval(days);
  const endDate = addDays(dateTo, 1);

  const buckets: CommentsStatsWindow['buckets'] = [];
  for (let date = dateFrom; date < endDate; date = nextBucketDate(date, interval)) {
    buckets.push({ date, start: startOfDay(date, timezone) });
  }

  return {
    from: buckets[0].start,
    to: startOfDay(endDate, timezone),
    previousFrom: startOfDay(addDays(dateFrom, -days), timezone),
    interval,
    buckets,
  };
}

export class CommentsAnalyticsService {
  private readonly knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.knex = knex;
  }

  async getOverview(options: unknown): Promise<CommentsOverview> {
    const window = getCommentsStatsWindow(options);
    const [periods, series, reported] = await Promise.all([
      this.countPeriods(window),
      this.countSeries(window),
      this.countReported(window),
    ]);

    const current = periods.find((row) => Number(row.is_current) === 1);
    const previous = periods.find((row) => Number(row.is_current) === 0);
    const seriesByBucket = new Map(series.map((row) => [Number(row.bucket), row]));
    const reportedByBucket = new Map(
      reported.map((row) => [Number(row.bucket), Number(row.reported)]),
    );

    return {
      totals: {
        comments: Number(current?.comments ?? 0),
        commenters: Number(current?.commenters ?? 0),
        reported: [...reportedByBucket].reduce(
          (sum, [bucket, count]) => sum + (bucket >= 0 ? count : 0),
          0,
        ),
      },
      previous_totals: {
        comments: Number(previous?.comments ?? 0),
        commenters: Number(previous?.commenters ?? 0),
        reported: reportedByBucket.get(-1) ?? 0,
      },
      interval: window.interval,
      series: window.buckets.map(({ date }, index) => {
        const row = seriesByBucket.get(index);
        return {
          date,
          comments: Number(row?.comments ?? 0),
          commenters: Number(row?.commenters ?? 0),
          reported: reportedByBucket.get(index) ?? 0,
        };
      }),
    };
  }

  async getTopPosts(options: unknown): Promise<{ data: TopCommentedPost[] }> {
    const window = getCommentsStatsWindow(options);
    const { limit } = parse(topSchema, options);
    const ranked = this.inRange(window.from, window.to)
      .select('c.post_id')
      .count({ comment_count: '*' })
      .groupBy('c.post_id')
      .orderBy([
        { column: 'comment_count', order: 'desc' },
        { column: 'c.post_id', order: 'asc' },
      ])
      .limit(limit)
      .as('t');

    const rows = await this.knex
      .select('t.post_id', 'p.title', 't.comment_count')
      .from(ranked)
      .join('posts as p', 'p.id', 't.post_id')
      .orderBy([
        { column: 't.comment_count', order: 'desc' },
        { column: 't.post_id', order: 'asc' },
      ]);

    return {
      data: rows.map((row) => ({
        post_id: row.post_id,
        title: row.title,
        comments: Number(row.comment_count),
      })),
    };
  }

  async getTopCommenters(options: unknown): Promise<{ data: TopCommenter[] }> {
    const window = getCommentsStatsWindow(options);
    const { limit } = parse(topSchema, options);
    const ranked = this.inRange(window.from, window.to)
      .whereNotNull('c.member_id')
      .select('c.member_id')
      .count({ comment_count: '*' })
      .groupBy('c.member_id')
      .orderBy([
        { column: 'comment_count', order: 'desc' },
        { column: 'c.member_id', order: 'asc' },
      ])
      .limit(limit)
      .as('t');

    // Name only: commenters are visible to roles that cannot read member emails
    const rows = await this.knex
      .select('t.member_id', 'm.name', 't.comment_count')
      .from(ranked)
      .join('members as m', 'm.id', 't.member_id')
      .orderBy([
        { column: 't.comment_count', order: 'desc' },
        { column: 't.member_id', order: 'asc' },
      ]);

    return {
      data: rows.map((row) => ({
        member_id: row.member_id,
        name: row.name,
        comments: Number(row.comment_count),
      })),
    };
  }

  // Covered by comments(created_at, status, member_id, post_id). Like the Admin
  // comments list, hides only deleted comments.
  private inRange(from: string, to: string) {
    return this.knex('comments as c')
      .where('c.created_at', '>=', from)
      .andWhere('c.created_at', '<', to)
      .andWhere('c.status', '<>', 'deleted');
  }

  // Byte comparison makes MySQL's DISTINCT ~4x faster than its collation; SQLite
  // already compares bytes, and its CAST(... AS BINARY) would coerce to numbers.
  private distinctCommenters() {
    const client = String(this.knex.client.config.client);
    return client.startsWith('mysql')
      ? this.knex.raw('COUNT(DISTINCT CAST(c.member_id AS BINARY)) AS commenters')
      : this.knex.raw('COUNT(DISTINCT c.member_id) AS commenters');
  }

  // Bucket index for c.created_at: -1 for the previous period, then 0..n-1.
  // Newest first, since most rows in a range are recent.
  private bucketExpression(window: CommentsStatsWindow) {
    const cases = window.buckets
      .map((_, index) => index)
      .reverse()
      .map(() => 'WHEN c.created_at >= ? THEN ?');
    const bindings = window.buckets
      .map(({ start }, index) => [start, index])
      .reverse()
      .flat();
    return this.knex.raw(`CASE ${cases.join(' ')} ELSE -1 END AS bucket`, bindings);
  }

  private async countPeriods(window: CommentsStatsWindow): Promise<AggregateRow[]> {
    return await this.inRange(window.previousFrom, window.to)
      .select(
        this.knex.raw('CASE WHEN c.created_at >= ? THEN 1 ELSE 0 END AS is_current', [window.from]),
      )
      .count({ comments: '*' })
      .select(this.distinctCommenters())
      .groupBy('is_current');
  }

  private async countSeries(window: CommentsStatsWindow): Promise<AggregateRow[]> {
    return await this.inRange(window.from, window.to)
      .select(this.bucketExpression(window))
      .count({ comments: '*' })
      .select(this.distinctCommenters())
      .groupBy('bucket');
  }

  // Driven from comment_reports, which is far smaller than comments. Each
  // comment lands in one bucket, so per-bucket counts sum to the totals.
  private async countReported(window: CommentsStatsWindow): Promise<AggregateRow[]> {
    return await this.knex('comment_reports as r')
      .join('comments as c', 'c.id', 'r.comment_id')
      .where('c.created_at', '>=', window.previousFrom)
      .andWhere('c.created_at', '<', window.to)
      .andWhere('c.status', '<>', 'deleted')
      .select(this.bucketExpression(window))
      .countDistinct({ reported: 'r.comment_id' })
      .groupBy('bucket');
  }
}
