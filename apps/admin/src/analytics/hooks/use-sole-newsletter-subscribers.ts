import { type GhAreaChartDataItem } from '@tryghost/shade/patterns';
import { formatNumber, formatPercentage } from '@tryghost/shade/utils';
import {
  getEffectiveChartRange,
  getRangeDates,
  sanitizeChartData,
} from '@/shared/analytics/chart-helpers';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useMemo } from 'react';
import { useNewslettersEnabled } from '@tryghost/admin-x-framework/api/settings';
import { useSubscriberCountWithRange } from './use-newsletter-stats-with-range';

export interface SoleNewsletterSubscribers {
  total: number;
  chartData: GhAreaChartDataItem[];
  chartRange: number;
  diffDirection: 'up' | 'down' | 'same';
  diffValue: string;
  trendingFromValue: string;
}

/**
 * Subscriber count and history for a site that sends exactly one newsletter.
 *
 * With several newsletters there is no single subscriber figure to show, so
 * `subscribers` is null; it is also null while `enabled` is false, which lets
 * the caller skip the requests when the overview won't show the card.
 */
export const useSoleNewsletterSubscribers = (range: number, enabled: boolean) => {
  const newslettersEnabled = useNewslettersEnabled();
  const shouldBrowse = enabled && newslettersEnabled === true;

  const { data: newslettersData, isLoading: isNewslettersLoading } = useBrowseNewsletters({
    searchParams: { filter: 'status:active', include: 'count.active_members', limit: '2' },
    enabled: shouldBrowse,
  });

  const soleNewsletter = useMemo(() => {
    const active = newslettersData?.newsletters.filter(({ status }) => status === 'active') ?? [];
    return active.length === 1 ? active[0] : null;
  }, [newslettersData]);

  const { data: subscriberStatsData, isLoading: isSubscriberStatsLoading } =
    useSubscriberCountWithRange(range, soleNewsletter?.id, shouldBrowse && !!soleNewsletter);

  const subscribers = useMemo((): SoleNewsletterSubscribers | null => {
    if (!shouldBrowse || !soleNewsletter) {
      return null;
    }

    const stat = subscriberStatsData?.stats?.[0];
    const total = soleNewsletter.count?.active_members ?? stat?.total ?? 0;
    let values = stat?.values ?? [];

    // A flat history comes back as a single point; stretch it across the range.
    if (values.length === 1) {
      const { startDate, endDate } = getRangeDates(range);
      values = [
        { ...values[0], date: startDate.format('YYYY-MM-DD') },
        { ...values[0], date: endDate.format('YYYY-MM-DD') },
      ];
    }

    const chartData = sanitizeChartData(values, range, 'value', 'exact').map((item) => ({
      date: item.date,
      value: item.value,
      formattedValue: formatNumber(item.value),
      label: 'Subscribers',
    }));

    const first = chartData[0]?.value ?? total;
    const last = chartData[chartData.length - 1]?.value ?? total;
    const change = first === 0 ? (last > 0 ? 1 : 0) : (last - first) / first;

    return {
      total,
      chartData,
      chartRange: getEffectiveChartRange(range, values),
      diffDirection: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
      diffValue: formatPercentage(change),
      trendingFromValue: formatNumber(first),
    };
  }, [shouldBrowse, soleNewsletter, subscriberStatsData, range]);

  return {
    subscribers,
    isLoading:
      shouldBrowse && (isNewslettersLoading || (!!soleNewsletter && isSubscriberStatsLoading)),
  };
};
