import { STATS_RANGE_OPTIONS, STATS_RANGES } from '@/shared/analytics/constants';

/**
 * Phrase for the prior comparison window. Matches the backend's
 * length-matched preceding range — not a year-over-year comparison.
 */
export function getPreviousPeriodText(range: number): string {
  if (range === STATS_RANGES.allTime.value) {
    return '';
  }
  if (range === STATS_RANGES.today.value) {
    return 'previous day';
  }
  if (range === STATS_RANGES.yearToDate.value) {
    return 'previous period';
  }

  const name = STATS_RANGE_OPTIONS.find((option) => option.value === range)?.name;
  if (!name) {
    return '';
  }

  return name.toLowerCase().replace(/^last /, 'previous ');
}
