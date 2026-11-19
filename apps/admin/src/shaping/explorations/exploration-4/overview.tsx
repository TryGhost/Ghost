import LatestPostBox from './latest-post-box';
import PostsTable from './posts-table';
import React from 'react';
import { OverviewExploration } from '@/shaping/explorations/exploration-1/overview';
import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';
import { useAnalytics } from '@/analytics/providers/analytics-context';
import { useLatestPostStats } from '@/analytics/hooks/use-latest-post-stats';
import { useTopPostsViews } from '@tryghost/admin-x-framework/api/stats';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 4's Overview: Exploration 1's screen (exploration-1/
// overview.tsx) with its own latest post and Top posts, in member detail's
// text styles (latest-post-box.tsx, posts-table.tsx). The stat cards and help
// banner get the same styles from exploration.css. Same layout as
// Exploration 1: a third and two thirds, stacked below lg.
const LatestAndTopPosts: React.FC = () => {
  const { range } = useAnalytics();
  const { startDate, endDate, timezone } = getRangeDates(range);
  const { data: latestPostStats, isLoading: isLatestPostLoading } = useLatestPostStats();
  const { data: topPostsData, isLoading: isTopPostsLoading } = useTopPostsViews({
    searchParams: {
      date_from: formatQueryDate(startDate),
      date_to: formatQueryDate(endDate),
      limit: '5',
      timezone,
    },
  });

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <LatestPostBox isLoading={isLatestPostLoading} latestPostStats={latestPostStats} />
      <PostsTable
        className="lg:col-span-2"
        isLoading={isTopPostsLoading}
        topPostsData={topPostsData}
      />
    </div>
  );
};

const Overview: React.FC = () => <OverviewExploration postsSection={<LatestAndTopPosts />} />;

export default Overview;
