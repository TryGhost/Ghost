import './post-analytics.css';
import '@/shaping/explorations/exploration-1/web-traffic.css';
import React, { useMemo } from 'react';
import SourcesCard from '@/shaping/explorations/exploration-1/sources-card';
import { BarChartLoadingIndicator, Skeleton } from '@tryghost/shade/components';
import { type BaseSourceData } from '@tryghost/admin-x-framework';
import { GhAreaChart, type GhAreaChartDataItem } from '@tryghost/shade/patterns';
import { formatNumber } from '@tryghost/shade/utils';
import { Section, Stat } from './section';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Post analytics' Web performance (posts/analytics/overview/components/
// web-overview.tsx) as an open section: the visitors number, the chart under
// it, then how readers found the post.

interface WebSectionProps {
  postId: string;
  sourcesData: BaseSourceData[] | null;
  chartData?: GhAreaChartDataItem[];
  range: number;
  isLoading: boolean;
  visitors: number;
}

const WebSection: React.FC<WebSectionProps> = ({
  postId,
  chartData,
  range,
  isLoading,
  visitors,
  sourcesData,
}) => {
  const { site } = useAnalyticsData();

  const totalSourcesVisits = useMemo(
    () => (sourcesData ?? []).reduce((sum, source) => sum + Number(source.visits || 0), 0),
    [sourcesData],
  );

  return (
    <Section
      href={`#/posts/analytics/${postId}/web`}
      id="post-web-heading"
      testId="web-performance"
      title="Web performance"
    >
      <div className="flex flex-col gap-8">
        {/* The number, then the chart right under it: the chart's own 32px
            top padding is the gap, as under Web traffic's tabs */}
        <div className="flex flex-col">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          ) : (
            <Stat label="Unique visitors" testId="unique-visitors">
              {formatNumber(visitors)}
            </Stat>
          )}

          {isLoading ? (
            <div className="flex h-[240px] items-center justify-center">
              <BarChartLoadingIndicator />
            </div>
          ) : (
            // Web traffic's top-chart style (post-analytics.css)
            <div className="post-open-chart [&_.recharts-cartesian-axis-tick-value]:fill-gray-500">
              <GhAreaChart
                className="aspect-auto h-[272px] w-full"
                color="var(--chart-blue)"
                data={chartData || []}
                id="visitors"
                range={range}
                syncId="overview-charts"
              />
            </div>
          )}
        </div>

        {/* Web traffic's Sources list (exploration-1/sources-card.tsx, opened
            up by web-traffic.css under .web-open-layout): a 17px title with
            the up-right "View all" arrow (the full list in a sheet),
            "Visitors" at the right, then the rows, with no bars */}
        <div className="web-open-layout">
          <SourcesCard
            data={sourcesData}
            isLoading={isLoading}
            limit={5}
            range={range}
            siteIcon={site.icon}
            siteUrl={site.url}
            title="How readers found this post"
            totalVisitors={totalSourcesVisits}
          />
        </div>
      </div>
    </Section>
  );
};

export default WebSection;
