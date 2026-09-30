import type { AutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';
import { formatNumber } from '@tryghost/shade/utils';
import { getEffectiveChartRange, sanitizeChartData } from '@/shared/analytics/chart-helpers';
import { STATS_RANGES } from '@/shared/analytics/constants';

export const mapAutomationEntryStats = (
  stats: AutomationPerformanceStats,
  range: number = STATS_RANGES.allTime.value,
) => {
  const hourly = stats.entry_window.bucket === 'hour';
  const entries = hourly ? stats.entries : sanitizeChartData(stats.entries, range, 'count', 'sum');
  const points = entries.map(({ date, count }) => ({
    date,
    value: count,
    formattedValue: formatNumber(count),
    label: 'Entries',
  }));
  return {
    showHours: hourly,
    allTime: range === STATS_RANGES.allTime.value,
    total: formatNumber(stats.total_run_count),
    points,
    range: hourly ? 1 : getEffectiveChartRange(range, stats.entries, { fieldName: 'count' }),
    max: Math.max(1, ...points.map((point) => point.value)),
    empty: stats.entries.every((entry) => entry.count === 0),
    startDate: stats.entry_window.date_from,
    endDate: hourly ? stats.entry_window.date_from : stats.entries[stats.entries.length - 1].date,
    timezone: stats.entry_window.timezone,
  };
};

export type AutomationEntriesChartData = ReturnType<typeof mapAutomationEntryStats>;
