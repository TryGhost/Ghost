import { STATS_RANGES } from '@/shared/analytics/constants';
import { formatQueryDate } from '@/shared/analytics/chart-helpers';
import moment from 'moment-timezone';
import { useMemo, useState } from 'react';

const DEFAULT_RANGE = STATS_RANGES.last30Days.value;

function getRangeDatesInTimezone(range: number, timezone: string) {
  const endDate = moment().tz(timezone).endOf('day');
  const startDate =
    range === STATS_RANGES.yearToDate.value
      ? moment().tz(timezone).startOf('year')
      : moment()
          .tz(timezone)
          .subtract(range - 1, 'days')
          .startOf('day');

  return { startDate, endDate };
}

export const useOverviewRange = (timezone: string) => {
  const [range, setRange] = useState<number>(DEFAULT_RANGE);

  const { dateFrom, dateTo } = useMemo(() => {
    const { startDate, endDate } = getRangeDatesInTimezone(range, timezone);
    return {
      dateFrom: formatQueryDate(startDate),
      dateTo: formatQueryDate(endDate),
    };
  }, [range, timezone]);

  return { range, setRange, dateFrom, dateTo, timezone };
};
