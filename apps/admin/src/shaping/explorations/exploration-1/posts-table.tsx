import FeatureImagePlaceholder from '@/shared/feature-image-placeholder';
import React from 'react';
import { EmptyIndicator, SkeletonTable } from '@tryghost/shade/components';
import { LucideIcon, cn, formatDisplayDate, formatNumber } from '@tryghost/shade/utils';
import { type TopPostViewsStats } from '@tryghost/admin-x-framework/api/stats';
import { CAPS_LABEL } from './type';
import { editorReturnState } from '@/editor/api';
import { getPeriodText } from '@/shared/analytics/chart-helpers';
import { getPostDestination } from '@/analytics/utils/url-helpers';
import { getSiteTimezone } from '@tryghost/admin-x-framework/utils/get-site-timezone';
import { useAnalytics } from '@/analytics/providers/analytics-context';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import {
  useMembersTrackSources,
  useWebAnalyticsEnabled,
} from '@tryghost/admin-x-framework/api/settings';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's posts beside the latest post, after the Vision prototype's
// TopPostsList, treated like Web traffic's lists: one title row carrying the
// column labels (Visitors, Members) over their numbers, no header row, then
// a row per post with its thumbnail, title, byline and the two numbers, with
// a rule above the first row (none between rows). Rows sit on the content edge
// and keep it there on hover: the row's hover fill (Shade's muted, as
// DataList rows use) reaches 12px past each side, so it marks the whole row
// as the target without moving its contents. Shade tokens throughout.
//
// The data is today's Top posts (most visitors in the date range), so it's
// titled "Top posts", not the Vision's "Recent posts": which one Overview
// should show is still an open question.

const NUMBER_COL = 'w-[88px] shrink-0 text-right';
const HEADER = CAPS_LABEL;

interface PostsTableProps {
  topPostsData: { stats?: TopPostViewsStats[] } | undefined;
  isLoading: boolean;
  className?: string;
}

const PostsTable: React.FC<PostsTableProps> = ({ topPostsData, isLoading, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { range } = useAnalytics();
  const { settings } = useAnalyticsData();
  const webAnalytics = useWebAnalyticsEnabled();
  const membersTrackSources = useMembersTrackSources() ?? false;
  const siteTimezone = getSiteTimezone(settings);
  const posts = topPostsData?.stats ?? [];

  const openPost = (post: TopPostViewsStats) => {
    const destination = getPostDestination({
      postId: post.post_id,
      hasEmailData: post.sent_count !== null,
      analytics: { webAnalytics, membersTrackSources },
    });
    const opensEditor = destination.startsWith('/editor/');
    navigate(destination, { state: opensEditor ? editorReturnState(location) : undefined });
  };

  return (
    <section className={cn('flex flex-col', className)} data-testid="top-posts-card">
      {/* The title row carries the column labels, over their numbers */}
      <div className="flex min-h-(--control-height) items-center gap-4 pb-[9px]">
        <h3 className="flex-1 text-3xl font-medium tracking-[-0.02em]">Top posts</h3>
        {webAnalytics && <span className={cn(HEADER, NUMBER_COL)}>Visitors</span>}
        <span className={cn(HEADER, NUMBER_COL)}>Members</span>
      </div>

      {isLoading ? (
        <SkeletonTable className="mt-4" />
      ) : posts.length === 0 ? (
        <EmptyIndicator className="w-full py-20" title={`No posts ${getPeriodText(range)}`}>
          <LucideIcon.FileText strokeWidth={1.5} />
        </EmptyIndicator>
      ) : (
        posts.map((post) => (
          <button
            key={post.post_id}
            className="group/post relative isolate flex cursor-pointer items-center gap-4 border-border py-1.5 text-left outline-none before:absolute before:-inset-x-3 before:inset-y-0 before:-z-10 before:rounded-sm before:bg-muted/60 before:opacity-0 before:transition-opacity first-of-type:border-t hover:before:opacity-100 focus-visible:before:opacity-100"
            type="button"
            onClick={() => openPost(post)}
          >
            {post.feature_image ? (
              <div
                className="h-[80px] w-[128px] shrink-0 rounded-[2px] bg-cover bg-center"
                style={{ backgroundImage: `url(${post.feature_image})` }}
              />
            ) : (
              // One shade darker than the placeholder's grey 100, so it stands out
              // from the row's hover fill
              <FeatureImagePlaceholder className="h-[80px] w-[128px] shrink-0 bg-gray-200" />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {/* 17px (Shade text-xl), the same as the latest post's title */}
              <span className="truncate text-xl font-medium tracking-tight">{post.title}</span>
              {/* "Aron Lemke · 26 Oct", no author link: the whole row is the
                  post's button, and this data has names only, no slugs */}
              <span className="text-md text-muted-foreground">
                {post.authors && <>{post.authors} &middot; </>}
                {formatDisplayDate(post.published_at, siteTimezone)}
              </span>
            </div>
            {webAnalytics && (
              <span className={cn(NUMBER_COL, 'text-md')}>{formatNumber(post.views)}</span>
            )}
            <span className={cn(NUMBER_COL, 'text-md')}>{formatNumber(post.members)}</span>
          </button>
        ))
      )}
    </section>
  );
};

export default PostsTable;
