import DateRangeSelect from '@/shared/analytics/date-range-select';
import React from 'react';
import { type STATS_RANGES } from '@/shared/analytics/constants';
import { useAnalytics } from '@/analytics/providers/analytics-context';

interface StatsDateRangeSelectProps {
  excludeRanges?: (keyof typeof STATS_RANGES)[];
  // The view charts members, revenue or subscribers, which need hourly
  // history for a single day; without it, single days aren't offered
  chartsDailyTotals?: boolean;
}

// Thin binding of the shared DateRangeSelect to the site-wide analytics
// view-state, so the many call sites don't each have to read the context.
const StatsDateRangeSelect: React.FC<StatsDateRangeSelectProps> = ({
  excludeRanges = [],
  chartsDailyTotals = false,
}) => {
  const { range, setRange, supportsHourly } = useAnalytics();
  const excluded =
    chartsDailyTotals && !supportsHourly ? [...excludeRanges, 'today' as const] : excludeRanges;

  return (
    <DateRangeSelect
      excludeRanges={excluded}
      range={range}
      allowCustomRange
      onRangeChange={setRange}
    />
  );
};

export default StatsDateRangeSelect;
