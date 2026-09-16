import moment from 'moment-timezone';
import type { PerformanceDateRange } from './performance-date-range';
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

// Search responses contain sparse daily buckets. Fill calendar days only after
// the complete scan, then reuse the ordinary chart's daily/weekly/monthly mapping.
export function mapAutomationSearchEntries(
  entries: AutomationEntryStats['entries'],
  dateRange: PerformanceDateRange,
  now = new Date(),
) {
  const { timezone, date_from: dateFrom, date_to: dateTo } = dateRange.searchParams;
  const today = moment(now).tz(timezone).format('YYYY-MM-DD');
  const dates = entries.map(({ date }) => date).sort();
  const start = dateFrom ?? dates[0] ?? today;
  const last = dates.at(-1) ?? today;
  const end = moment.utc(dateTo ?? (last > today ? last : today)).add(1, 'day');
  const byDate = new Map(entries.map(({ date, count }) => [date, count]));
  const filled = [];
  for (const day = moment.utc(start); day.isBefore(end); day.add(1, 'day')) {
    const date = day.format('YYYY-MM-DD');
    filled.push({ date, count: byDate.get(date) ?? 0 });
  }
  return mapAutomationEntryStats(
    {
      automation_id: '',
      total_run_count: entries.reduce((sum, { count }) => sum + count, 0),
      entries: filled,
      window: { date_from: start, date_to: end.format('YYYY-MM-DD'), timezone, bucket: 'day' },
    },
    dateRange.value === 'all' ? STATS_RANGES.allTime.value : dateRange.value,
  );
}
