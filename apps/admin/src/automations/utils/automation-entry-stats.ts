import type { AutomationEntryStats } from '@tryghost/admin-x-framework/api/automations';
import { formatNumber } from '@tryghost/shade/utils';
import { getEffectiveChartRange, sanitizeChartData } from '@/shared/analytics/chart-helpers';
import { STATS_RANGES } from '@/shared/analytics/constants';

export const mapAutomationEntryStats = (
  stats: AutomationEntryStats,
  range: number = STATS_RANGES.allTime.value,
) => {
  const points = sanitizeChartData(stats.entries, range, 'count', 'sum').map(({ date, count }) => ({
    date,
    value: count,
    formattedValue: formatNumber(count),
    label: 'Entries',
  }));
  return {
    allTime: range === STATS_RANGES.allTime.value,
    total: formatNumber(stats.total_run_count),
    points,
    range: getEffectiveChartRange(range, stats.entries, { fieldName: 'count' }),
    max: Math.max(1, ...points.map((point) => point.value)),
    empty: stats.entries.every((entry) => entry.count === 0),
    startDate: stats.window.date_from,
    endDate: stats.entries[stats.entries.length - 1].date,
    timezone: stats.window.timezone,
  };
};

export type AutomationEntriesChartData = ReturnType<typeof mapAutomationEntryStats>;
