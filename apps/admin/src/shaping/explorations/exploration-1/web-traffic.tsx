import './web-traffic.css';
import DateRangeSelect from '@/analytics/views/stats/components/date-range-select';
import LocationsCard from '@/analytics/views/stats/locations/components/locations-card';
import React, { useCallback, useMemo, useRef } from 'react';
import SourcesCard from './sources-card';
import StatsFilter from '@/shared/analytics/stats-filter';
import StatsHeader from '@/analytics/views/stats/layout/stats-header';
import StatsLayout from '@/analytics/views/stats/layout/stats-layout';
import StatsView from '@/analytics/views/stats/layout/stats-view';
import TopContent from './top-content';
import WebKPIs from './web-kpis';
import type { KpiDataItem } from '@/analytics/views/stats/web/components/web-kpis';
import { NavbarActions } from '@tryghost/shade/components';
import { useTinybirdQuery } from '@tryghost/admin-x-framework';
import { STATS_DEFAULT_SOURCE_ICON_URL } from '@/shared/analytics/constants';
import { CONTENT_TYPES } from '@/analytics/utils/content-helpers';
import { createFilter } from '@tryghost/shade/patterns';
import { getScrollParent } from '@tryghost/shade/utils';
import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';
import { getAudienceFromFilterValues, getAudienceQueryParam } from '@/shared/analytics/audience';
import { ANALYTICS_FILTER_FIELDS, useFilterParams } from '@/shared/analytics/use-filter-params';
import { useAnalytics } from '@/analytics/providers/analytics-context';
import { useAnalyticsData } from '@/shared/analytics/use-analytics-data';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1, Web traffic: the real screen's data and components
// (copied from analytics/views/stats/web/web.tsx), arranged without the
// outlined cards. The KPIs and chart sit in the open like the Overview stat
// cards; Top content, Top sources and Locations become sections with a rule
// under each heading (web-traffic.css).

const WebOpenLayout: React.FC = () => {
  const { range } = useAnalytics();
  const { statsConfig, isLoading: isConfigLoading, site } = useAnalyticsData();
  const { startDate, endDate, timezone } = getRangeDates(range);
  const containerRef = useRef<HTMLDivElement>(null);

  const { filters: analyticsFilters, setFilters: setAnalyticsFilters } = useFilterParams({
    supportedFields: ANALYTICS_FILTER_FIELDS,
    trackingSource: 'stats',
  });

  const audience = useMemo(() => {
    const audienceFilter = analyticsFilters.find((f) => f.field === 'audience');
    return getAudienceFromFilterValues(audienceFilter?.values as string[] | undefined);
  }, [analyticsFilters]);

  const scrollToTop = useCallback(() => {
    const scrollContainer = getScrollParent(containerRef.current);
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // As web.tsx: filters to Tinybird params
  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    analyticsFilters.forEach((filter) => {
      const fieldKey = filter.field;
      const values = filter.values;
      if (fieldKey === 'audience') {
        return;
      }
      const hasValue = values && values.length > 0 && values[0] !== null && values[0] !== undefined;
      const isEmptySourceFilter = fieldKey === 'source' && values?.[0] === '';
      if (hasValue && (values[0] !== '' || isEmptySourceFilter)) {
        const value = String(values[0]);
        if (fieldKey === 'post') {
          if (value.startsWith('/')) {
            params.pathname = value;
          } else {
            params.post_uuid = value;
          }
        } else {
          params[fieldKey] = value;
        }
      }
    });
    return params;
  }, [analyticsFilters]);

  const handleFilterClick = useCallback(
    (field: string, value: string) => {
      setAnalyticsFilters((prevFilters) => {
        const existingFilter = prevFilters.find((f) => f.field === field);
        if (existingFilter) {
          return prevFilters.map((f) => (f.field === field ? { ...f, values: [value] } : f));
        }
        return [...prevFilters, createFilter(field, 'is', [value])];
      });
      scrollToTop();
    },
    [setAnalyticsFilters, scrollToTop],
  );

  const params = useMemo(
    () => ({
      site_uuid: statsConfig?.id || '',
      date_from: formatQueryDate(startDate),
      date_to: formatQueryDate(endDate),
      timezone: timezone,
      member_status: getAudienceQueryParam(audience),
      ...filterParams,
    }),
    [statsConfig?.id, startDate, endDate, timezone, audience, filterParams],
  );

  const { data: kpiData, loading: kpiLoading } = useTinybirdQuery({
    endpoint: 'api_kpis',
    statsConfig,
    params,
  });
  const { data: sourcesData, loading: isSourcesLoading } = useTinybirdQuery({
    endpoint: 'api_top_sources',
    statsConfig,
    params,
  });
  const { data: locationsData, loading: isLocationsLoading } = useTinybirdQuery({
    endpoint: 'api_top_locations',
    statsConfig,
    params,
  });

  const totalVisitors = kpiData?.length
    ? kpiData.reduce((sum, item) => sum + Number(item.visits), 0)
    : 0;
  const hasFilters = analyticsFilters.length > 0;

  return (
    <StatsLayout ref={containerRef}>
      <StatsHeader>
        {hasFilters && (
          <NavbarActions>
            <DateRangeSelect />
          </NavbarActions>
        )}
        <NavbarActions
          className={`${hasFilters ? 'mt-0! [grid-area:subactions] lg:mt-[25px]!' : '[grid-area:actions]'}`}
        >
          <StatsFilter
            filters={analyticsFilters}
            range={range}
            showPostField
            onChange={setAnalyticsFilters}
          />
          {!hasFilters && <DateRangeSelect />}
        </NavbarActions>
      </StatsHeader>
      <StatsView isLoading={isConfigLoading} loadingComponent={<></>}>
        <div className="web-open-layout flex flex-col gap-15">
          <WebKPIs data={kpiData as KpiDataItem[] | null} isLoading={kpiLoading} range={range} />
          {/* EXPLORATION: one section, Breakdown, holding the four lists
              as subsections, on thirds: Posts two thirds wide, down the
              height of the other two, with room for its long titles (two
              lines each, and more rows); Pages and Sources stacked in the
              last third, their labels short. Then Locations on its own row
              (its list and map side by side).

              Hairlines between the three, as Exploration 3's Recent posts: a
              vertical one between Posts and the right column, 40px either
              side, and a horizontal one between Pages and Sources (and
              between all three when they stack, below lg). */}
          <section className="flex flex-col gap-6" data-breakdown>
            <h2 className="text-3xl font-medium tracking-[-0.02em]">Breakdown</h2>
            <div className="flex grid-cols-3 flex-col lg:grid">
              <div className="pb-8 lg:col-span-2 lg:border-r lg:border-border lg:pr-10 lg:pb-0">
                <TopContent
                  audience={audience}
                  contentType={CONTENT_TYPES.POSTS}
                  filterParams={filterParams}
                  limit={9}
                  range={range}
                  title="Posts"
                  totalVisitors={totalVisitors}
                  wrapTitles
                />
              </div>
              <div className="flex flex-col border-t border-border pt-8 lg:border-t-0 lg:pt-0 lg:pl-10">
                <div className="pb-8">
                  <TopContent
                    audience={audience}
                    contentType={CONTENT_TYPES.PAGES}
                    filterParams={filterParams}
                    limit={3}
                    range={range}
                    title="Pages"
                    totalVisitors={totalVisitors}
                  />
                </div>
                <div className="border-t border-border pt-8">
                  <SourcesCard
                    data={sourcesData}
                    defaultSourceIconUrl={STATS_DEFAULT_SOURCE_ICON_URL}
                    isLoading={isSourcesLoading}
                    limit={3}
                    range={range}
                    siteIcon={site.icon}
                    siteUrl={site.url}
                    totalVisitors={totalVisitors}
                    onSourceClick={(source) => handleFilterClick('source', source)}
                  />
                </div>
              </div>
            </div>
            <div className="pt-9">
              <LocationsCard
                data={locationsData}
                isLoading={isLocationsLoading}
                range={range}
                onLocationClick={(location) => handleFilterClick('location', location)}
              />
            </div>
          </section>
        </div>
      </StatsView>
    </StatsLayout>
  );
};

export default WebOpenLayout;
