import type { Knex } from 'knex';
import {
  getDateBoundaries,
  getPreviousDateBoundaries,
  applyDateFilter,
  validateDateRangeOptions,
} from './utils/date-utils';
import {
  resolveSeriesAggregation,
  getFixedOffsetMinutes,
  getSeriesBucket,
  formatBucketDate,
  fillSeries,
  type DateRange,
  type SeriesAggregation,
} from './utils/series-utils';

const VISIBLE_STATUSES = ['published', 'hidden'] as const;

export interface CommentsOverviewTotals {
  comments: number;
  commenters: number;
  reported: number;
}

export interface CommentsOverviewSeriesItem {
  date: string;
  count: number;
  commenters: number;
  reported: number;
}

export interface CommentsOverviewTopPost {
  id: string;
  title: string;
  slug: string;
  count: number;
}

export interface CommentsOverviewTopMember {
  id: string;
  name: string | null;
  count: number;
}

export interface CommentsOverview {
  totals: CommentsOverviewTotals;
  previous_totals: CommentsOverviewTotals | null;
  series: CommentsOverviewSeriesItem[];
  series_aggregation: SeriesAggregation;
  top_posts: CommentsOverviewTopPost[];
  top_members: CommentsOverviewTopMember[];
}

export interface CommentsOverviewOptions {
  date_from: string;
  date_to: string;
  timezone?: string;
}

interface CommentsStatsServiceDeps {
  knex: Knex;
}

interface CountRow {
  count: string | number;
  commenters?: string | number;
}

interface ReportedCountRow {
  reported: string | number;
}

interface BucketedCountRow {
  date: string | Date;
  count: string | number;
  commenters?: string | number;
  reported?: string | number;
}

interface TopPostRow {
  id: string;
  title: string;
  slug: string;
  count: string | number;
}

interface TopMemberRow {
  id: string;
  name: string | null;
  count: string | number;
}

export class CommentsStatsService {
  private readonly knex: Knex;

  constructor(deps: CommentsStatsServiceDeps) {
    this.knex = deps.knex;
  }

  /**
   * Aggregate comment analytics for the moderation dashboard.
   */
  async getOverview(options: CommentsOverviewOptions): Promise<CommentsOverview> {
    const timezone = options.timezone || 'UTC';
    const dateOptions = {
      date_from: options.date_from,
      date_to: options.date_to,
      timezone,
    };
    validateDateRangeOptions(dateOptions);

    const knex = this.knex;
    const range = getDateBoundaries(dateOptions);
    const previousRange = getPreviousDateBoundaries(dateOptions);
    const seriesAggregation = resolveSeriesAggregation(range);

    const [totals, previousTotals, series, topPosts, topMembers] = await Promise.all([
      this._getTotals(knex, range),
      previousRange ? this._getTotals(knex, previousRange) : Promise.resolve(null),
      this._getSeries(knex, range, timezone, seriesAggregation),
      this._getTopPosts(knex, range),
      this._getTopMembers(knex, range),
    ]);

    return {
      totals,
      previous_totals: previousTotals,
      series,
      series_aggregation: seriesAggregation,
      top_posts: topPosts,
      top_members: topMembers,
    };
  }

  private _applyRange(
    query: Knex.QueryBuilder,
    column: string,
    { dateFrom, dateTo }: DateRange,
  ): Knex.QueryBuilder {
    applyDateFilter(query, dateFrom, dateTo, column);
    return query;
  }

  private _hasReport(knex: Knex) {
    return function (this: Knex.QueryBuilder) {
      this.select(knex.raw('1'))
        .from('comment_reports')
        .whereRaw('comment_reports.comment_id = comments.id');
    };
  }

  private async _getTotals(knex: Knex, range: DateRange): Promise<CommentsOverviewTotals> {
    const commentsQuery = knex('comments')
      .whereIn('status', [...VISIBLE_STATUSES])
      .count({ count: '*' })
      .countDistinct({ commenters: 'member_id' });
    this._applyRange(commentsQuery, 'comments.created_at', range);

    const reportedQuery = knex('comments')
      .whereIn('status', [...VISIBLE_STATUSES])
      .whereExists(this._hasReport(knex))
      .countDistinct({ reported: 'id' });
    this._applyRange(reportedQuery, 'comments.created_at', range);

    const [[commentsRow], [reportedRow]] = await Promise.all([
      commentsQuery as Promise<CountRow[]>,
      reportedQuery as Promise<ReportedCountRow[]>,
    ]);

    return {
      comments: Number(commentsRow.count) || 0,
      commenters: Number(commentsRow.commenters) || 0,
      reported: Number(reportedRow.reported) || 0,
    };
  }

  private async _getSeries(
    knex: Knex,
    range: DateRange,
    timezone: string,
    aggregation: SeriesAggregation,
  ): Promise<CommentsOverviewSeriesItem[]> {
    const offsetMinutes = getFixedOffsetMinutes(timezone);
    const bucket = getSeriesBucket(knex, 'comments.created_at', offsetMinutes, aggregation);

    const commentsQuery = knex('comments')
      .whereIn('status', [...VISIBLE_STATUSES])
      .select(bucket.select)
      .count({ count: '*' })
      .countDistinct({ commenters: 'member_id' })
      .groupByRaw(bucket.group)
      .orderByRaw('date ASC');
    this._applyRange(commentsQuery, 'comments.created_at', range);

    const reportedQuery = knex('comments')
      .whereIn('status', [...VISIBLE_STATUSES])
      .whereExists(this._hasReport(knex))
      .select(bucket.select)
      .countDistinct({ reported: 'id' })
      .groupByRaw(bucket.group)
      .orderByRaw('date ASC');
    this._applyRange(reportedQuery, 'comments.created_at', range);

    const [commentsRows, reportedRows] = await Promise.all([
      commentsQuery as Promise<BucketedCountRow[]>,
      reportedQuery as Promise<BucketedCountRow[]>,
    ]);

    const byDate = new Map<string, CommentsOverviewSeriesItem>();
    for (const row of commentsRows) {
      const date = formatBucketDate(row.date);
      byDate.set(date, {
        date,
        count: Number(row.count) || 0,
        commenters: Number(row.commenters) || 0,
        reported: 0,
      });
    }
    for (const row of reportedRows) {
      const date = formatBucketDate(row.date);
      const existing = byDate.get(date) || { date, count: 0, commenters: 0, reported: 0 };
      existing.reported = Number(row.reported) || 0;
      byDate.set(date, existing);
    }

    return fillSeries([...byDate.values()], range, offsetMinutes, aggregation, (date) => ({
      date,
      count: 0,
      commenters: 0,
      reported: 0,
    }));
  }

  private async _getTopPosts(
    knex: Knex,
    range: DateRange,
    limit = 25,
  ): Promise<CommentsOverviewTopPost[]> {
    const query = knex('comments')
      .join('posts', 'posts.id', 'comments.post_id')
      .whereIn('comments.status', [...VISIBLE_STATUSES])
      .select('posts.id as id', 'posts.title as title', 'posts.slug as slug')
      .count({ count: 'comments.id' })
      .groupBy('posts.id', 'posts.title', 'posts.slug')
      .orderBy('count', 'desc')
      .orderBy('posts.id', 'asc')
      .limit(limit);
    this._applyRange(query, 'comments.created_at', range);

    const rows = (await query) as TopPostRow[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      count: Number(row.count) || 0,
    }));
  }

  /**
   * Member email is deliberately not selected here. The response is surfaced
   * as aggregate analytics, and the id is enough for the UI to drill through
   * to the member record, which enforces its own permissions.
   */
  private async _getTopMembers(
    knex: Knex,
    range: DateRange,
    limit = 25,
  ): Promise<CommentsOverviewTopMember[]> {
    const query = knex('comments')
      .join('members', 'members.id', 'comments.member_id')
      .whereIn('comments.status', [...VISIBLE_STATUSES])
      .whereNotNull('comments.member_id')
      .select('members.id as id', 'members.name as name')
      .count({ count: 'comments.id' })
      .groupBy('members.id', 'members.name')
      .orderBy('count', 'desc')
      .orderBy('members.id', 'asc')
      .limit(limit);
    this._applyRange(query, 'comments.created_at', range);

    const rows = (await query) as TopMemberRow[];
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      count: Number(row.count) || 0,
    }));
  }
}
