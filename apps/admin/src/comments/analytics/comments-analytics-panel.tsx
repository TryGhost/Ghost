import CommentsKpis from './comments-kpis';
import CommentsTopList from './comments-top-list';
import React, { useMemo } from 'react';
import { Button, Card } from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { getPeriodText } from '@/shared/analytics/chart-helpers';
import type { CommentsAnalytics } from './use-comments-analytics';

const CommentsAnalyticsPanel: React.FC<{
  analytics: CommentsAnalytics;
  onFilter: (field: 'post' | 'author', id: string) => void;
}> = ({ analytics, onFilter }) => {
  const { range, customRange, tab, setTab, overview, topPosts, topCommenters } = analytics;
  const period = customRange ? 'in the selected period' : getPeriodText(range);
  const comparisonDays = customRange
    ? (Date.parse(customRange.to) - Date.parse(customRange.from)) / 86400000 + 1
    : undefined;
  const queries = [overview, topPosts, topCommenters];
  const failed = queries.some(({ isError }) => isError);

  const postRows = useMemo(
    () =>
      topPosts.data?.stats.map(({ post_id: id, title, comments }) => ({
        id,
        label: title,
        comments,
      })),
    [topPosts.data],
  );
  const commenterRows = useMemo(
    () =>
      topCommenters.data?.stats.map(({ member_id: id, name, comments }) => ({
        id,
        label: name || 'Unknown member',
        comments,
      })),
    [topCommenters.data],
  );

  return (
    <Stack data-testid="comments-analytics" gap="lg">
      <Text as="h2" size="sm" tone="secondary" weight="medium">
        Analytics
      </Text>
      {failed ? (
        <Stack align="center" className="py-10 text-center" gap="md">
          <Text size="sm" tone="secondary">
            Comment analytics couldn&apos;t be loaded.
          </Text>
          <Button
            variant="outline"
            onClick={() => queries.forEach(({ isError, refetch }) => isError && void refetch())}
          >
            Retry
          </Button>
        </Stack>
      ) : (
        <>
          <Card className="overflow-hidden pb-4">
            <CommentsKpis
              comparisonDays={comparisonDays}
              isLoading={overview.isLoading}
              range={range}
              stats={overview.data?.stats[0]}
              tab={tab}
              onTabChange={setTab}
            />
          </Card>
          <CommentsTopList
            data-testid="comments-analytics-top-posts"
            description={`Posts with the most comments ${period}`}
            isLoading={topPosts.isLoading}
            rows={postRows}
            title="Top posts"
            onSelect={({ id }) => onFilter('post', id)}
          />
          <CommentsTopList
            data-testid="comments-analytics-top-commenters"
            description={`Members who commented most ${period}`}
            isLoading={topCommenters.isLoading}
            rows={commenterRows}
            title="Top commenters"
            onSelect={({ id }) => onFilter('author', id)}
          />
        </>
      )}
    </Stack>
  );
};

export default CommentsAnalyticsPanel;
