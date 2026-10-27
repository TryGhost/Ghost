import DateRangeSelect from '@/analytics/views/stats/components/date-range-select';
import HelpBanners from './help-banners';
import LatestPostBox from './latest-post-box';
import OverviewKPIs from './overview-kpis';
import PostsTable from './posts-table';
import React, { useMemo } from 'react';
import StatsHeader from '@/analytics/views/stats/layout/stats-header';
import StatsLayout from '@/analytics/views/stats/layout/stats-layout';
import StatsView from '@/analytics/views/stats/layout/stats-view';
import { ALL_AUDIENCES } from '@/shared/analytics/constants';
import { type GhAreaChartDataItem } from '@tryghost/shade/patterns';
import { formatNumber } from '@tryghost/shade/utils';
import { NavbarActions } from '@tryghost/shade/components';
import {
  centsToDollars,
  formatQueryDate,
  getEffectiveChartRange,
  getRangeDates,
  sanitizeChartData,
} from '@/shared/analytics/chart-helpers';
import { getAudienceQueryParam } from '@/shared/analytics/audience';
import { usePaidMembersEnabled } from '@tryghost/admin-x-framework/api/settings';
import { useAnalytics } from '@/analytics/providers/analytics-context';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';
import { useGrowthStats } from '@/analytics/hooks/use-growth-stats';
import { useLatestPostStats } from '@/analytics/hooks/use-latest-post-stats';
import { useTinybirdQuery } from '@tryghost/admin-x-framework';
import { useTopPostsViews } from '@tryghost/admin-x-framework/api/stats';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's Overview: the real screen's data (copied from
// analytics/views/stats/overview/overview.tsx), with the latest post and top
// posts laid out as in the Vision prototype: the latest post in a grey box,
// a third wide, and the posts as a table beside it (latest-post-box.tsx,
// posts-table.tsx).

interface WebKpiDataItem {
  date: string;
  [key: string]: string | number;
}

type GrowthChartDataItem = {
  date: string;
  value: number;
  free: number;
  paid: number;
  comped: number;
  gift: number;
  mrr: number;
  formattedValue: string;
  label?: string;
};

const OverviewExploration: React.FC = () => {
  const paidMembersEnabled = usePaidMembersEnabled();
  const { range } = useAnalytics();
  const { statsConfig, isLoading: isConfigLoading } = useAnalyticsData();
  const { startDate, endDate, timezone } = getRangeDates(range);
  const {
    isLoading: isGrowthStatsLoading,
    chartData: growthChartData,
    totals: growthTotals,
    currencySymbol,
  } = useGrowthStats(range);
  const { data: latestPostStats, isLoading: isLatestPostLoading } = useLatestPostStats();
  const { data: topPostsData, isLoading: isTopPostsLoading } = useTopPostsViews({
    searchParams: {
      date_from: formatQueryDate(startDate),
      date_to: formatQueryDate(endDate),
      limit: '5',
      timezone,
    },
  });

  /* Get visitors
    /* ---------------------------------------------------------------------- */
  const visitorsParams = {
    site_uuid: statsConfig?.id || '',
    date_from: formatQueryDate(startDate),
    date_to: formatQueryDate(endDate),
    timezone: timezone,
    member_status: getAudienceQueryParam(ALL_AUDIENCES),
  };

  const { data: visitorsData, loading: isVisitorsLoading } = useTinybirdQuery({
    endpoint: 'api_kpis',
    statsConfig,
    params: visitorsParams,
  });

  const visitorsChartData = useMemo(() => {
    return sanitizeChartData<WebKpiDataItem>(
      (visitorsData as WebKpiDataItem[]) || [],
      range,
      'visits',
      'sum',
    )?.map((item: WebKpiDataItem) => {
      const value = Number(item.visits);
      const safeValue = isNaN(value) ? 0 : value;
      return {
        date: String(item.date),
        value: safeValue,
        formattedValue: formatNumber(safeValue),
        label: 'Visitors',
      };
    });
  }, [visitorsData, range]);
  const visitorsChartRange = useMemo(() => {
    return getEffectiveChartRange(range, (visitorsData as WebKpiDataItem[]) || [], {
      fieldName: 'visits',
    });
  }, [visitorsData, range]);

  const visitorsYRange: [number, number] = useMemo(() => {
    const defaultRange: [number, number] = [0, 1];
    if (!visitorsChartData || visitorsChartData.length === 0) {
      return defaultRange; // Default range when no data
    }

    // Extract values and filter out negative values
    const values = visitorsChartData
      .map((item: GhAreaChartDataItem) => item.value)
      .filter((value: number) => value >= 0); // Only keep non-negative values

    if (values.length === 0) {
      return defaultRange; // Default range if no valid values
    }

    const maxValue = Math.max(...values);
    return [0, maxValue || defaultRange[1]]; // Use 10 as minimum if maxValue is 0
  }, [visitorsChartData]);

  const growthChartRange = useMemo(() => {
    return getEffectiveChartRange(range, growthChartData || []);
  }, [growthChartData, range]);

  /* Get members
    /* ---------------------------------------------------------------------- */
  // Create chart data based on selected tab
  const membersChartData = useMemo(() => {
    if (!growthChartData || growthChartData.length === 0) {
      return [];
    }

    let sanitizedData: GrowthChartDataItem[] = [];
    const fieldName: keyof GrowthChartDataItem = 'value';

    sanitizedData = sanitizeChartData<GrowthChartDataItem>(
      growthChartData,
      range,
      fieldName,
      'exact',
    );

    // Then map the sanitized data to the final format
    const processedData: GhAreaChartDataItem[] = sanitizedData.map((item) => ({
      date: item.date,
      value: item.free + item.paid,
      formattedValue: formatNumber(item.free + item.paid),
      label: 'Members',
    }));

    return processedData;
  }, [growthChartData, range]);

  /* Get MRR
    /* ---------------------------------------------------------------------- */
  // Create chart data based on selected tab
  const mrrChartData = useMemo(() => {
    if (!paidMembersEnabled || !growthChartData || growthChartData.length === 0) {
      return [];
    }

    let sanitizedData: GrowthChartDataItem[] = [];
    const fieldName: keyof GrowthChartDataItem = 'mrr';

    sanitizedData = sanitizeChartData<GrowthChartDataItem>(
      growthChartData,
      range,
      fieldName,
      'exact',
    );

    // Then map the sanitized data to the final format
    const processedData: GhAreaChartDataItem[] = sanitizedData.map((item) => ({
      date: item.date,
      value: centsToDollars(item.mrr),
      formattedValue: `${currencySymbol}${formatNumber(centsToDollars(item.mrr))}`,
      label: 'MRR',
    }));

    return processedData;
  }, [growthChartData, range, currencySymbol, paidMembersEnabled]);

  /* Calculate KPI values
    /* ---------------------------------------------------------------------- */
  const kpiValues = useMemo(() => {
    // Visitors data
    if (!visitorsData?.length) {
      return { visits: '0' };
    }

    const totalVisits = visitorsData.reduce((sum, item) => {
      const visits = Number(item.visits);
      return sum + (isNaN(visits) ? 0 : visits);
    }, 0);

    return {
      visits: formatNumber(totalVisits),
    };
  }, [visitorsData]);

  const isPageLoading = isConfigLoading;

  return (
    <StatsLayout>
      <StatsHeader>
        <NavbarActions>
          <DateRangeSelect excludeRanges={['today']} />
        </NavbarActions>
      </StatsHeader>
      <StatsView isLoading={isPageLoading} loadingComponent={<></>}>
        <OverviewKPIs
          currencySymbol={currencySymbol}
          growthChartRange={growthChartRange}
          growthTotals={growthTotals}
          isLoading={isVisitorsLoading || isGrowthStatsLoading}
          kpiValues={kpiValues}
          membersChartData={membersChartData}
          mrrChartData={mrrChartData}
          visitorsChartData={visitorsChartData}
          visitorsChartRange={visitorsChartRange}
          visitorsYRange={visitorsYRange}
        />
        {/* EXPLORATION: the latest post and the posts beside it, a third and
            two thirds, as in the Vision prototype; stacked below lg. Same
            columns and 40px gap as the stat cards above (overview-kpis.tsx,
            admin7-analytics:gap-10), so the latest post lines up under
            Unique visitors and the posts under Members and MRR. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <LatestPostBox isLoading={isLatestPostLoading} latestPostStats={latestPostStats} />
          <PostsTable
            className="lg:col-span-2"
            isLoading={isTopPostsLoading}
            topPostsData={topPostsData}
          />
        </div>
        {/* EXPLORATION: the help links as a banner and a card, on the same
            thirds (help-banners.tsx). No "Grow your audience" title for now. */}
        <HelpBanners />
      </StatsView>
    </StatsLayout>
  );
};

export default OverviewExploration;
