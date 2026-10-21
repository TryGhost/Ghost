import moment from 'moment-timezone';
import { hasHourlyInterval } from '@/shared/analytics/chart-helpers';
import { useMemberCountHistory } from '@tryghost/admin-x-framework/api/stats';

/**
 * Whether the server answers a single day's member, revenue and subscriber
 * history by the hour. Servers that can't only have two daily totals for a
 * day, which can't be charted next to hourly visitors, so single days are
 * left out of those views until the server catches up (Admin ships ahead of
 * the server on Ghost(Pro) for about a day).
 *
 * Asks once, for today, which also warms the cache for the Today view.
 */
export const useHourlyHistorySupport = (): { isLoading: boolean; supportsHourly: boolean } => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = moment().tz(timezone).format('YYYY-MM-DD');
  const { data, isLoading, isError } = useMemberCountHistory({
    searchParams: {
      date_from: moment(today).subtract(1, 'day').format('YYYY-MM-DD'),
      date_to: today,
      interval: 'hour',
      timezone,
    },
    // A failure just means single days stay out, as on older servers
    defaultErrorHandler: false,
  });

  return { isLoading, supportsHourly: !isError && hasHourlyInterval(data) };
};
