import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  addDays,
  daysBetween,
  localDateOf,
  resolveTimeZone,
  startOfLocalDay,
} from '../../../kernel/clock';
const nql = require('@tryghost/nql');

export type CommentsInterval = 'day' | 'week' | 'month';

export type CommentsStatsWindow = {
  /** UTC datetimes as stored in the database; `to` is exclusive */
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
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
export type TopCommenter = {
  member_id: string;
  name: string | null;
  avatar_image: string | null;
  comments: number;
};

// Calendar dates are YYYY-MM-DD; database datetimes are UTC "YYYY-MM-DD HH:mm:ss"
const toDatetime = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const countDays = (dateFrom: string, dateTo: string) => daysBetween(dateFrom, dateTo) + 1;

/** Half-open database bounds of inclusive local dates */
function localDateBounds(dateFrom: string, dateTo: string, timezone: string) {
  return {
    from: toDatetime(startOfLocalDay(dateFrom, timezone)),
    to: toDatetime(startOfLocalDay(addDays(dateTo, 1), timezone)),
  };
}

const MAX_RANGE_DAYS = 3660;
// Admin shows the top 25. Larger limits are capped by the API's maxLimitCap
// (optimization:maxLimit, 100 by default), like every other endpoint.
const DEFAULT_TOP_LIMIT = 25;

const messages = {
  invalidOptions: 'Invalid comments stats options.',
  reversedDateRange: 'date_from must be on or before date_to.',
  rangeTooLong: `The date range must not exceed ${MAX_RANGE_DAYS} days.`,
  futureDateTo: 'date_to must not be later than tomorrow.',
};

// Tomorrow in UTC is today somewhere, so every site's today is allowed
const latestDateTo = () => addDays(new Date().toISOString().slice(0, 10), 1);

// "All time" covers the same span as the longest explicit range
const earliestDateFrom = (dateTo: string) => addDays(dateTo, 1 - MAX_RANGE_DAYS);

const timezoneSchema = z
  .string()
  .refine((value) => resolveTimeZone(value) !== null, { abort: true })
  .transform((value) => resolveTimeZone(value)!)
  .default('UTC');

// Without date_from the range starts at the first comment ("All time"), at most
// MAX_RANGE_DAYS before date_to
const rangeSchema = z
  .object({
    date_from: z.iso.date().optional(),
    date_to: z.iso.date(),
    timezone: timezoneSchema,
  })
  .superRefine((options, context) => {
    if (options.date_to > latestDateTo()) {
      context.addIssue({ code: 'custom', message: messages.futureDateTo });
    } else if (options.date_from === undefined) {
      return;
    } else if (options.date_from > options.date_to) {
      context.addIssue({ code: 'custom', message: messages.reversedDateRange });
    } else if (countDays(options.date_from, options.date_to) > MAX_RANGE_DAYS) {
      context.addIssue({ code: 'custom', message: messages.rangeTooLong });
    }
  })
  .transform(({ date_from: dateFrom, date_to: dateTo, timezone }) => ({
    dateFrom: dateFrom ?? null,
    dateTo,
    timezone,
  }));

export type CommentsStatsRange = z.output<typeof rangeSchema>;

const topSchema = z.object({
  limit: z.coerce.number().int().min(1).default(DEFAULT_TOP_LIMIT),
});

const filterSchema = z.object({ filter: z.string().optional() });
const FILTER_FIELDS = new Set([
  'post_id',
  'member_id',
  'html',
  'status',
  'created_at',
  'count.reports',
]);

// Use the same NQL parser and SQL compiler as the comments list. A subquery
// avoids multiplying aggregate rows when filtering on reports, and keeps the
// compiler's table names independent of the analytics queries' aliases.
function matchingComments(knex: Knex, options: unknown): Knex.QueryBuilder | undefined {
  const { filter } = parse(filterSchema, options);
  if (!filter) {
    return undefined;
  }

  const query = knex('comments').select('comments.id');
  try {
    nql(filter, {
      transformer: (input: object) =>
        nql.utils.mapQuery(input, (value: unknown, key: string) => {
          if (!FILTER_FIELDS.has(key)) {
            throw new errors.ValidationError({
              message: `Unsupported comments stats filter field: ${key}`,
            });
          }
          return { [key === 'count.reports' ? 'report_count' : key]: value };
        }),
      relations: {
        report_count: {
          type: 'aggregate',
          tableName: 'comment_reports',
          joinFrom: 'comment_id',
          aggregate: { fn: 'count', column: 'comment_reports.id' },
        },
      },
    }).querySQL(query);
  } catch (error) {
    throw new errors.ValidationError({
      message: 'Invalid comments stats filter.',
      context: error instanceof Error ? error.message : undefined,
    });
  }
  return query;
}

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

export function parseCommentsStatsRange(options: unknown): CommentsStatsRange {
  return parse(rangeSchema, options);
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
    return addDays(date, 7 - new Date(`${date}T00:00:00Z`).getUTCDay());
  }
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

// The previous period is as many local days before dateFrom (DST-aligned), cut
// at the same elapsed point while the range runs. Without comparePrevious it is
// empty.
export function getCommentsStatsWindow(
  { dateFrom, dateTo, timezone }: CommentsStatsRange & { dateFrom: string },
  { now = Date.now(), comparePrevious = true } = {},
): CommentsStatsWindow {
  const days = countDays(dateFrom, dateTo);
  const interval = getInterval(days);
  const endDate = addDays(dateTo, 1);

  const buckets: CommentsStatsWindow['buckets'] = [];
  for (let date = dateFrom; date < endDate; date = nextBucketDate(date, interval)) {
    buckets.push({ date, start: toDatetime(startOfLocalDay(date, timezone)) });
  }

  const from = startOfLocalDay(dateFrom, timezone);
  const to = startOfLocalDay(endDate, timezone);
  const previousFrom = comparePrevious ? startOfLocalDay(addDays(dateFrom, -days), timezone) : from;
  const previousTo =
    now < to ? Math.min(from, Math.max(previousFrom, previousFrom + now - from)) : from;

  return {
    from: toDatetime(from),
    to: toDatetime(to),
    previousFrom: toDatetime(previousFrom),
    previousTo: toDatetime(previousTo),
    interval,
    buckets,
  };
}

// Drivers return DATETIME as a Date or as a "YYYY-MM-DD HH:mm:ss" UTC string
const datetimeMs = (value: Date | string) =>
  value instanceof Date ? value.getTime() : Date.parse(`${value.replace(' ', 'T')}Z`);

export class CommentsAnalyticsService {
  private readonly knex: Knex;
  private readonly memberAvatarImage: (email: string | null | undefined) => string | null;

  constructor({
    knex,
    memberAvatarImage,
  }: {
    knex: Knex;
    memberAvatarImage: (email: string | null | undefined) => string | null;
  }) {
    this.knex = knex;
    this.memberAvatarImage = memberAvatarImage;
  }

  async getOverview(options: unknown): Promise<CommentsOverview> {
    const matching = matchingComments(this.knex, options);
    const window = await this.getWindow(parseCommentsStatsRange(options), matching);
    const [periods, series, reported] = await Promise.all([
      this.countPeriods(window, matching),
      this.countSeries(window, matching),
      this.countReported(window, matching),
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
    const rows = await this.ranked('post_id', options)
      .join('posts as p', 'p.id', 't.post_id')
      .select('t.post_id', 'p.title', 't.comment_count');

    return {
      data: rows.map((row) => ({
        post_id: row.post_id,
        title: row.title,
        comments: Number(row.comment_count),
      })),
    };
  }

  async getTopCommenters(options: unknown): Promise<{ data: TopCommenter[] }> {
    // Email is used only to derive the same avatar as the members list.
    const rows = await this.ranked('member_id', options)
      .join('members as m', 'm.id', 't.member_id')
      .select('t.member_id', 'm.name', 'm.email', 't.comment_count');

    return {
      data: rows.map((row) => ({
        member_id: row.member_id,
        name: row.name,
        avatar_image: this.memberAvatarImage(row.email),
        comments: Number(row.comment_count),
      })),
    };
  }

  // An unbounded range starts on the first comment's local day, so the interval
  // fits the comments that exist. It has nothing to compare against.
  private async getWindow(range: CommentsStatsRange, matching?: Knex.QueryBuilder) {
    if (range.dateFrom !== null) {
      return getCommentsStatsWindow({ ...range, dateFrom: range.dateFrom });
    }
    const earliest = earliestDateFrom(range.dateTo);
    const { from, to } = localDateBounds(earliest, range.dateTo, range.timezone);
    const first = await this.inRange(from, to, matching).min({ first: 'c.created_at' }).first();
    const dateFrom = first?.first
      ? localDateOf(datetimeMs(first.first), range.timezone)
      : range.dateTo;
    return getCommentsStatsWindow(
      { ...range, dateFrom: dateFrom < earliest ? earliest : dateFrom },
      { comparePrevious: false },
    );
  }

  // The top `limit` values of the column by comment count, ties broken by id,
  // as subquery `t` for the caller to join
  private ranked(column: 'post_id' | 'member_id', options: unknown) {
    const range = parseCommentsStatsRange(options);
    const { limit } = parse(topSchema, options);
    const { from, to } = localDateBounds(
      range.dateFrom ?? earliestDateFrom(range.dateTo),
      range.dateTo,
      range.timezone,
    );
    const ranking = this.inRange(from, to, matchingComments(this.knex, options))
      .whereNotNull(`c.${column}`)
      .select(`c.${column}`)
      .count({ comment_count: '*' })
      .groupBy(`c.${column}`)
      .orderBy([
        { column: 'comment_count', order: 'desc' },
        { column: `c.${column}`, order: 'asc' },
      ])
      .limit(limit)
      .as('t');

    return this.knex.from(ranking).orderBy([
      { column: 't.comment_count', order: 'desc' },
      { column: `t.${column}`, order: 'asc' },
    ]);
  }

  // Covered by comments(created_at, status, member_id, post_id). Like the Admin
  // comments list, hides only deleted comments.
  private inRange(from: string, to: string, matching?: Knex.QueryBuilder) {
    const query = this.knex('comments as c')
      .where('c.created_at', '>=', from)
      .andWhere('c.created_at', '<', to)
      .andWhere('c.status', '<>', 'deleted');
    if (matching) {
      query.whereIn('c.id', matching);
    }
    return query;
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

  private skipPreviousRemainder(query: Knex.QueryBuilder, window: CommentsStatsWindow) {
    return query
      .where('c.created_at', '<', window.previousTo)
      .orWhere('c.created_at', '>=', window.from);
  }

  private async countPeriods(
    window: CommentsStatsWindow,
    matching?: Knex.QueryBuilder,
  ): Promise<AggregateRow[]> {
    return await this.inRange(window.previousFrom, window.to, matching)
      .where((builder) => this.skipPreviousRemainder(builder, window))
      .select(
        this.knex.raw('CASE WHEN c.created_at >= ? THEN 1 ELSE 0 END AS is_current', [window.from]),
      )
      .count({ comments: '*' })
      .select(this.distinctCommenters())
      .groupBy('is_current');
  }

  private async countSeries(
    window: CommentsStatsWindow,
    matching?: Knex.QueryBuilder,
  ): Promise<AggregateRow[]> {
    return await this.inRange(window.from, window.to, matching)
      .select(this.bucketExpression(window))
      .count({ comments: '*' })
      .select(this.distinctCommenters())
      .groupBy('bucket');
  }

  // Driven from comment_reports, which is far smaller than comments. Each
  // comment lands in one bucket, so per-bucket counts sum to the totals.
  private async countReported(
    window: CommentsStatsWindow,
    matching?: Knex.QueryBuilder,
  ): Promise<AggregateRow[]> {
    const query = this.knex('comment_reports as r')
      .join('comments as c', 'c.id', 'r.comment_id')
      .where('c.created_at', '>=', window.previousFrom)
      .andWhere('c.created_at', '<', window.to)
      .andWhere('c.status', '<>', 'deleted')
      .where((builder) => this.skipPreviousRemainder(builder, window))
      .select(this.bucketExpression(window))
      .countDistinct({ reported: 'r.comment_id' })
      .groupBy('bucket');
    if (matching) {
      query.whereIn('c.id', matching);
    }
    return await query;
  }
}
