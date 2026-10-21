import { Fragment, type ReactNode, useState } from 'react';
import { AnalyticsContext } from '@/analytics/providers/analytics-context';
import { STATS_DEFAULT_RANGE_KEY, STATS_RANGE_OPTIONS } from '@/shared/analytics/constants';
import { useAllTimeStart } from '@/analytics/hooks/use-all-time-start';
import { useStatsTimezone } from '@/shared/analytics/use-stats-timezone';
import { useHourlyHistorySupport } from '@/analytics/hooks/use-hourly-history-support';
import { type StatsRange } from '@/shared/analytics/chart-helpers';

// Slim provider: holds only the analytics view-state (selected date range +
// newsletter). All framework data is sourced from the shell via `useAnalyticsData`.
const AnalyticsProvider = ({ children }: { children: ReactNode }) => {
  const [range, setRange] = useState<StatsRange>(
    STATS_RANGE_OPTIONS[STATS_DEFAULT_RANGE_KEY].value,
  );
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  // Where All time starts depends on the site's history, so the views wait
  // for it rather than working their ranges out twice
  // Days are counted in the site's timezone; the views below are keyed on it
  const timezone = useStatsTimezone();
  const { isLoading: isAllTimeStartLoading } = useAllTimeStart(timezone);
  // Whether single days can be charted by the hour decides which ranges the
  // date menus offer, so it's known before they render
  const { isLoading: isHourlySupportLoading, supportsHourly } = useHourlyHistorySupport();

  if (isAllTimeStartLoading || isHourlySupportLoading) {
    return null;
  }

  return (
    <AnalyticsContext.Provider
      value={{
        range,
        setRange,
        selectedNewsletterId,
        setSelectedNewsletterId,
        supportsHourly,
      }}
    >
      <Fragment key={timezone}>{children}</Fragment>
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsProvider;
