import './web-traffic.css';
import DateRangeSelect from '@/analytics/views/stats/components/date-range-select';
import EmailsList from './emails-list';
import NewsletterKPIs from '@/analytics/views/stats/newsletters/components/newsletters-kpis';
import NewsletterSelect from '@/analytics/views/stats/components/newsletter-select';
import React, { useMemo } from 'react';
import StatsHeader from '@/analytics/views/stats/layout/stats-header';
import StatsLayout from '@/analytics/views/stats/layout/stats-layout';
import StatsView from '@/analytics/views/stats/layout/stats-view';
import type { AvgsDataItem } from '@/analytics/views/stats/newsletters/newsletters';
import { Card, CardContent, NavbarActions } from '@tryghost/shade/components';
import { Navigate, useSearchParams } from '@tryghost/admin-x-framework';
import { getRangeDates } from '@/shared/analytics/chart-helpers';
import { useAnalytics } from '@/analytics/providers/analytics-context';
import { useBrowseNewsletters } from '@tryghost/admin-x-framework/api/newsletters';
import { useNewslettersEnabled } from '@tryghost/admin-x-framework/api/settings';
import {
  useNewsletterStatsWithRangeSplit,
  useSubscriberCountWithRange,
} from '@/analytics/hooks/use-newsletter-stats-with-range';

// EXPLORATION ONLY — never merge (see src/shaping/README.md).
//
// Exploration 1's Newsletters: the real screen's data (copied from
// analytics/views/stats/newsletters/newsletters.tsx), with its "Top
// newsletters" table replaced by a Breakdown section holding Emails, a Web
// traffic list (emails-list.tsx). The top chart is restyled by
// exploration.css, as on the real screen.

const Newsletters: React.FC = () => {
  const { range, selectedNewsletterId } = useAnalytics();
  const [searchParams] = useSearchParams();
  const newslettersEnabled = useNewslettersEnabled();

  // Get the initial tab from URL search parameters
  const initialTab = searchParams.get('tab') || 'total-subscribers';

  // Get newsletters list for dropdown (without expensive counts)
  const { data: newslettersData, isLoading: isNewslettersLoading } = useBrowseNewsletters({
    searchParams: {
      limit: '50',
    },
  });

  // Only enable stats queries once newsletters are loaded AND we have a newsletter selected
  const shouldFetchStats =
    !isNewslettersLoading &&
    newslettersData &&
    newslettersData.newsletters.length > 0 &&
    !!selectedNewsletterId;

  // Get subscriber count over time for the selected newsletter
  const { data: subscriberStatsData, isLoading: isSubscriberStatsLoading } =
    useSubscriberCountWithRange(
      range,
      selectedNewsletterId || undefined,
      shouldFetchStats || false,
    );

  // Get newsletter stats with click data, for the averages
  const {
    data: newsletterStatsData,
    isLoading: isNewsletterStatsLoading,
    isClicksLoading,
  } = useNewsletterStatsWithRangeSplit(
    range,
    'date asc',
    selectedNewsletterId || undefined,
    shouldFetchStats || false,
  );

  // Find the selected newsletter to get its active_members count
  const selectedNewsletter = useMemo(() => {
    if (!newslettersData?.newsletters || !selectedNewsletterId) {
      return null;
    }
    return newslettersData.newsletters.find((n) => n.id === selectedNewsletterId) || null;
  }, [newslettersData, selectedNewsletterId]);

  // Calculate totals for KPIs
  const totals = useMemo(() => {
    const totalSubscribers =
      selectedNewsletter?.count?.active_members || subscriberStatsData?.stats?.[0]?.total || 0;

    let avgOpenRate = 0;
    let avgClickRate = 0;

    if (newsletterStatsData?.stats && newsletterStatsData.stats.length > 0) {
      const stats = newsletterStatsData.stats;
      const totalOpenRate = stats.reduce((sum, stat) => sum + (stat.open_rate || 0), 0);
      const totalClickRate = stats.reduce((sum, stat) => sum + (stat.click_rate || 0), 0);

      avgOpenRate = totalOpenRate / stats.length;
      avgClickRate = totalClickRate / stats.length;
    }

    return {
      totalSubscribers,
      avgOpenRate,
      avgClickRate,
    };
  }, [selectedNewsletter, subscriberStatsData, newsletterStatsData]);

  // Create subscribers data from newsletter subscriber stats
  const subscribersData = useMemo(() => {
    if (
      !subscriberStatsData?.stats?.[0]?.values ||
      subscriberStatsData.stats[0].values.length === 0
    ) {
      // When there's no data, create zero points for each day spanning the range
      const { startDate, endDate } = getRangeDates(range);

      const dailyData = [];
      const currentDate = startDate.clone().toDate();
      const endDateObj = endDate.toDate();

      while (currentDate <= endDateObj) {
        dailyData.push({
          date: currentDate.toISOString().split('T')[0],
          value: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dailyData;
    }

    const values = subscriberStatsData.stats[0].values;

    // If we only have one data point, create two points spanning the range
    if (values.length === 1) {
      const singlePoint = values[0];
      const now = new Date();
      const startDate = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);

      return [
        { ...singlePoint, date: startDate.toISOString().split('T')[0] },
        { ...singlePoint, date: now.toISOString().split('T')[0] },
      ];
    }

    return values;
  }, [subscriberStatsData, range]);

  // Create avgsData from newsletter stats for the bar charts
  const avgsData: AvgsDataItem[] = useMemo(() => {
    if (!newsletterStatsData?.stats) {
      return [];
    }

    return newsletterStatsData.stats.map((stat) => ({
      post_id: stat.post_id,
      post_title: stat.post_title,
      send_date: stat.send_date,
      sent_to: stat.sent_to,
      total_opens: stat.total_opens,
      open_rate: stat.open_rate,
      total_clicks: stat.total_clicks || 0,
      click_rate: stat.click_rate || 0,
    }));
  }, [newsletterStatsData]);

  const isKPIsLoading = isSubscriberStatsLoading || isClicksLoading || isNewsletterStatsLoading;

  // Hold the redirect until settings resolve: `undefined` means still loading,
  // only a settled `false` bounces to the overview.
  if (newslettersEnabled === false) {
    return <Navigate to="/analytics" />;
  }

  return (
    <StatsLayout>
      <StatsHeader>
        <NavbarActions>
          <NewsletterSelect newsletters={newslettersData?.newsletters} />
          <DateRangeSelect />
        </NavbarActions>
      </StatsHeader>
      <StatsView isLoading={false} loadingComponent={<></>}>
        <>
          <Card data-testid="newsletters-card">
            <CardContent>
              <NewsletterKPIs
                avgsData={avgsData}
                initialTab={initialTab}
                isAvgsLoading={false}
                isLoading={isKPIsLoading}
                subscribersData={subscribersData}
                totals={totals}
              />
            </CardContent>
          </Card>
          {/* EXPLORATION: a Breakdown section, as on Web traffic, holding
              Emails as its subsection (styled by web-traffic.css) */}
          <section className="web-open-layout flex flex-col gap-6" data-breakdown>
            <h2 className="text-3xl font-medium tracking-[-0.02em]">Breakdown</h2>
            <EmailsList
              range={range}
              selectedNewsletterId={selectedNewsletterId}
              shouldFetchStats={!!shouldFetchStats}
            />
          </section>
        </>
      </StatsView>
    </StatsLayout>
  );
};

export default Newsletters;
