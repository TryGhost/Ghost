import DisabledSourcesIndicator from '@/shared/analytics/disabled-sources-indicator';
import GiftLinkModal from '@/posts/analytics/modals/gift-link-modal';
import Sidebar from './sidebar';
import NewsletterSection from './newsletter-section';
import PostAnalyticsContent from '@/posts/analytics/components/post-analytics-content';
import PostAnalyticsHeader from '@/posts/analytics/components/post-analytics-header';
import WebSection from './web-section';
import { BarChartLoadingIndicator } from '@tryghost/shade/components';
import { KPI_METRICS } from '@/posts/analytics/web/components/kpi-metrics';
import { type KpiDataItem } from '@/posts/analytics/utils/kpi-helpers';
import { type Post, usePostAnalytics } from '@/posts/analytics/providers/post-analytics-context';
import { STATS_RANGES } from '@/shared/analytics/constants';
import {
  formatQueryDate,
  getEffectiveChartRange,
  getRangeDates,
  getRangeForStartDate,
  sanitizeChartData,
} from '@/shared/analytics/chart-helpers';
import { isPublishedOnly, useNavigate, useTinybirdQuery } from '@tryghost/admin-x-framework';
import { useActiveGiftLink } from '@tryghost/admin-x-framework/api/gift-links';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import {
  useEmailTrackClicks,
  useEmailTrackOpens,
  useMembersTrackSources,
  usePaidMembersEnabled,
  useWebAnalyticsEnabled,
} from '@tryghost/admin-x-framework/api/settings';
import { useCanManageGiftLink } from '@/posts/analytics/hooks/use-can-manage-gift-link';
import { useEffect, useMemo, useState } from 'react';
import { useGiftLinkUsage } from '@/posts/analytics/hooks/use-gift-link-usage';
import { usePostReferrers } from '@/posts/analytics/hooks/use-post-referrers';
import { useEmailSendingStatusContext } from '@/posts/analytics/email-sending-status/email-sending-status-context';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 3's post analytics Overview, laid out like member detail
// (members/detail/member-detail.tsx): open sections in a main column (Web,
// then Newsletter, stacked), and Growth with the gift link in a 320px column
// on the right. No card boxes or padding; member detail's text styles
// (section-heading, stat-label, stat-value, column-label). The data is the
// real Overview's (posts/analytics/overview/overview.tsx), copied as is.

const PostAnalyticsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { statsConfig, isLoading: isConfigLoading } = useAnalyticsData();
  const { post, isPostLoading, postId } = usePostAnalytics();
  const { totals, isLoading: isTotalsLoading, currencySymbol } = usePostReferrers(postId);
  const emailTrackClicksEnabled = useEmailTrackClicks();
  const emailTrackOpensEnabled = useEmailTrackOpens();
  const membersTrackSources = useMembersTrackSources();
  const paidMembersEnabled = usePaidMembersEnabled();
  const webAnalyticsEnabled = useWebAnalyticsEnabled();
  const { hasNewsletterAnalytics, isStatusLoading } = useEmailSendingStatusContext();

  const canManageGiftLink = useCanManageGiftLink(post);
  const {
    token: giftToken,
    isLoading: giftTokenLoading,
    error: giftTokenError,
  } = useActiveGiftLink(postId, { enabled: canManageGiftLink });
  const { usage: giftLinkUsage, loading: giftLinkUsageLoading } = useGiftLinkUsage({
    postUuid: post?.uuid,
    token: giftToken,
    tokenLoading: giftTokenLoading,
    tokenError: giftTokenError,
    enabled: canManageGiftLink,
  });
  const [isGiftLinkOpen, setIsGiftLinkOpen] = useState(false);

  const chartRange = useMemo(
    () =>
      post?.published_at ? getRangeForStartDate(post.published_at) : STATS_RANGES.allTime.value,
    [post?.published_at],
  );

  const {
    startDate: chartStartDate,
    endDate: chartEndDate,
    timezone: chartTimezone,
  } = getRangeDates(chartRange);

  const params = useMemo(
    () => ({
      site_uuid: statsConfig?.id || '',
      date_from: formatQueryDate(chartStartDate),
      date_to: formatQueryDate(chartEndDate),
      timezone: chartTimezone,
      post_uuid: !isPostLoading && post?.uuid ? post.uuid : '',
    }),
    [isPostLoading, post, statsConfig?.id, chartStartDate, chartEndDate, chartTimezone],
  );

  const { data: chartData, loading: chartLoading } = useTinybirdQuery({
    endpoint: 'api_kpis',
    statsConfig,
    params,
  });

  const totalVisitors = useMemo(
    () =>
      (chartData ?? []).reduce((sum, item) => {
        const visits = Number(item.visits);
        return sum + (isNaN(visits) ? 0 : visits);
      }, 0),
    [chartData],
  );

  const currentMetric = KPI_METRICS.visits;
  const displayChartRange = getEffectiveChartRange(chartRange, (chartData as KpiDataItem[]) || [], {
    fieldName: currentMetric.dataKey as keyof KpiDataItem,
  });
  const processedChartData = sanitizeChartData<KpiDataItem>(
    (chartData as KpiDataItem[]) || [],
    chartRange,
    currentMetric.dataKey as keyof KpiDataItem,
    'sum',
  )?.map((item: KpiDataItem) => {
    const value = Number(item[currentMetric.dataKey]);
    return {
      date: String(item.date),
      value,
      formattedValue: currentMetric.formatter(value),
      label: currentMetric.label,
    };
  });

  const { data: sourcesData, loading: isSourcesLoading } = useTinybirdQuery({
    endpoint: 'api_top_sources',
    statsConfig,
    params,
  });

  const kpiIsLoading = isConfigLoading || isTotalsLoading || isPostLoading || chartLoading;

  const showNewsletterSection =
    hasNewsletterAnalytics && emailTrackOpensEnabled && emailTrackClicksEnabled;
  const showWebSection = !post?.email_only && webAnalyticsEnabled;
  const showGrowthSection = membersTrackSources;
  const showGiftLinkCard = Boolean(canManageGiftLink && post && webAnalyticsEnabled);

  // As the real Overview: a published-only post without web analytics goes
  // straight to Growth
  useEffect(() => {
    if (
      !isPostLoading &&
      post &&
      isPublishedOnly(post) &&
      !webAnalyticsEnabled &&
      showGrowthSection
    ) {
      navigate(`/posts/analytics/${postId}/growth`, { replace: true });
    }
  }, [isPostLoading, post, webAnalyticsEnabled, navigate, postId, showGrowthSection]);

  if (isPostLoading) {
    return <BarChartLoadingIndicator />;
  }

  return (
    <>
      <PostAnalyticsHeader currentTab="Overview" />
      <PostAnalyticsContent>
        {/* Member detail's two columns: the main one fills the space, 80px
            from a 320px column on the right (stacked below lg). The right
            column always shows, with at least the post's details. */}
        <div className="flex flex-1 flex-col gap-8 lg:flex-row lg:items-start lg:gap-20">
          {/* 72px between sections; section titles 19px, as in member
              detail's main column */}
          <div className="flex min-w-0 flex-1 flex-col gap-18 [--text-section-heading:var(--text-section-heading-lg)]">
            {!showWebSection && !showNewsletterSection && (
              <DisabledSourcesIndicator className="py-20" />
            )}
            {showWebSection && (
              <WebSection
                chartData={processedChartData}
                isLoading={kpiIsLoading || isSourcesLoading}
                postId={postId}
                range={displayChartRange}
                sourcesData={sourcesData}
                visitors={totalVisitors}
              />
            )}
            {showNewsletterSection && (
              <NewsletterSection
                isLoading={isPostLoading || isStatusLoading}
                post={post as Post}
                postId={postId}
              />
            )}
          </div>
          {post && (
            <Sidebar
              currencySymbol={currencySymbol}
              giftLinkVisits={giftLinkUsage?.visits}
              isGiftLinkLoading={giftLinkUsageLoading}
              isLoading={kpiIsLoading}
              paidMembersEnabled={Boolean(paidMembersEnabled)}
              post={post}
              postId={postId}
              showGiftLink={showGiftLinkCard}
              showGrowth={Boolean(showGrowthSection)}
              totals={totals}
              onShareGiftLink={() => setIsGiftLinkOpen(true)}
            />
          )}
        </div>
      </PostAnalyticsContent>
      {showGiftLinkCard && (
        <GiftLinkModal
          key={postId}
          open={isGiftLinkOpen}
          postId={postId}
          source="gift-link-card"
          onOpenChange={setIsGiftLinkOpen}
        />
      )}
    </>
  );
};

export default PostAnalyticsOverview;
