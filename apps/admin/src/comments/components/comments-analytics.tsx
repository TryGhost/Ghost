import DateRangeSelect from '@/shared/analytics/date-range-select';
import OverviewKpiTabs from './overview-kpi-tabs';
import OverviewTopMembers from './overview-top-members';
import OverviewTopPosts from './overview-top-posts';
import React from 'react';
import {
  type CommentsOverview,
  type CommentsOverviewResponseType,
} from '@tryghost/admin-x-framework/api/stats';
import { type CommentFilterPatch } from '@/comments/apply-comment-filters';

interface CommentsAnalyticsProps {
  range: number;
  dateFrom?: string;
  dateTo?: string;
  setRange: (range: number) => void;
  isLoading: boolean;
  data: CommentsOverviewResponseType | undefined;
  onApplyFilters: (patches: CommentFilterPatch[]) => void;
}

const EMPTY_OVERVIEW: CommentsOverview = {
  totals: { comments: 0, commenters: 0, reported: 0 },
  previous_totals: null,
  series: [],
  series_aggregation: 'day',
  top_posts: [],
  top_members: [],
};

const CommentsAnalytics: React.FC<CommentsAnalyticsProps> = ({
  range,
  dateFrom,
  dateTo,
  setRange,
  isLoading,
  data,
  onApplyFilters,
}) => {
  const overview = data?.stats?.[0] ?? EMPTY_OVERVIEW;
  const rangePatches: CommentFilterPatch[] =
    dateFrom && dateTo
      ? [
          { field: 'created_at', operator: 'is-or-greater', value: dateFrom },
          { field: 'created_at', operator: 'is-or-less', value: dateTo },
        ]
      : [];

  return (
    <div className="flex flex-col gap-5 pb-6" data-testid="comments-analytics">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Analytics</h2>
        <DateRangeSelect range={range} onRangeChange={setRange} />
      </div>
      <OverviewKpiTabs
        isLoading={isLoading}
        previousTotals={data ? overview.previous_totals : undefined}
        range={range}
        series={data ? overview.series : undefined}
        seriesAggregation={overview.series_aggregation}
        totals={data ? overview.totals : undefined}
        onApplyFilters={onApplyFilters}
      />
      <OverviewTopPosts
        isLoading={isLoading}
        posts={data ? overview.top_posts : undefined}
        range={range}
        onRowClick={(postId) => onApplyFilters([...rangePatches, { field: 'post', value: postId }])}
      />
      <OverviewTopMembers
        isLoading={isLoading}
        members={data ? overview.top_members : undefined}
        range={range}
        onRowClick={(memberId) =>
          onApplyFilters([...rangePatches, { field: 'author', value: memberId }])
        }
      />
    </div>
  );
};

export default CommentsAnalytics;
