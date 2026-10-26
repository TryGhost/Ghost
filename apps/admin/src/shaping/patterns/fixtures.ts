import { type BaseSourceData } from '@tryghost/admin-x-framework';
import { type GhAreaChartDataItem } from '@tryghost/shade/patterns';
import { type TopPostViewsStats } from '@tryghost/admin-x-framework/api/stats';
import { formatNumber } from '@tryghost/shade/utils';
import { type AvgsDataItem } from '@/analytics/views/stats/newsletters/newsletters';
import { type KpiDataItem } from '@/analytics/views/stats/web/components/web-kpis';
import { type LatestPostWithStats } from '@/analytics/hooks/use-latest-post-stats';
import { type NewsletterRadialChartData } from '@/posts/analytics/newsletter/components/newsletter-radial-chart';
import { type FakeScenarioId } from '@/shaping/data/scenario';
import { PROFILES } from '@/shaping/data/profiles';
import {
  isoDay,
  locationsOf,
  membersOn,
  mrrOn,
  offsetsBetween,
  pageviewsOn,
  paidChangesOn,
  postMembers,
  postViews,
  postsOf,
  sendsOf,
  sourcesOf,
  subscribersOn,
  totalVisits,
  visitsOn,
} from '@/shaping/data/generate';

// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
//
// Sample data for the patterns page, built from the scenario picked in the
// prototype menu (shaping/data) for the date range in the header. Shaped
// exactly like what each component gets from its real query, so the page
// shows the real components, not lookalikes.

export const CURRENCY = '$';

type Direction = 'up' | 'down' | 'same';

const change = (first: number, last: number): { direction: Direction; percent: string } => {
  if (first === last || first === 0) {
    return { direction: last > first ? 'up' : 'same', percent: '0%' };
  }
  const percent = ((last - first) / first) * 100;
  return {
    direction: percent > 0 ? 'up' : 'down',
    percent: `${Math.abs(percent).toFixed(1)}%`,
  };
};

export const buildFixtures = (scenario: FakeScenarioId, range: number) => {
  const profile = PROFILES[scenario];
  const offsets = offsetsBetween(null, null, range);
  const first = offsets[0];

  /* Web traffic */

  const webKpis: KpiDataItem[] = offsets.map((offset) => ({
    date: isoDay(offset),
    visits: visitsOn(profile, offset),
    pageviews: pageviewsOn(profile, offset),
  }));
  const visitors = totalVisits(profile, offsets);
  const visitorsChart: GhAreaChartDataItem[] = offsets.map((offset) => ({
    date: isoDay(offset),
    value: visitsOn(profile, offset),
    formattedValue: formatNumber(visitsOn(profile, offset)),
    label: 'Visitors',
  }));
  const sources: BaseSourceData[] = sourcesOf(visitors).map((row) => ({
    source: row.name,
    visits: row.value,
  }));
  const locations = locationsOf(visitors).map((row) => ({
    location: row.name,
    visits: row.value,
  }));

  /* Members and MRR */

  const growthChart = offsets.map((offset) => {
    const members = membersOn(profile, offset);
    const changes = paidChangesOn(profile, offset);
    return {
      date: isoDay(offset),
      value: members.free + members.paid,
      ...members,
      mrr: mrrOn(profile, offset),
      paid_subscribed: changes.signups,
      paid_canceled: changes.cancellations,
      formattedValue: formatNumber(members.free + members.paid),
    };
  });
  const firstMembers = membersOn(profile, first);
  const today = membersOn(profile, 0);
  const total = change(firstMembers.free + firstMembers.paid, today.free + today.paid);
  const free = change(firstMembers.free, today.free);
  const paid = change(firstMembers.paid, today.paid);
  const mrr = change(mrrOn(profile, first), mrrOn(profile, 0));
  const growthTotals = {
    totalMembers: today.free + today.paid,
    freeMembers: today.free,
    paidMembers: today.paid,
    mrr: mrrOn(profile, 0),
    percentChanges: {
      total: total.percent,
      free: free.percent,
      paid: paid.percent,
      mrr: mrr.percent,
    },
    directions: {
      total: total.direction,
      free: free.direction,
      paid: paid.direction,
      mrr: mrr.direction,
    },
  };
  const membersChart: GhAreaChartDataItem[] = growthChart.map((item) => ({
    date: item.date,
    value: item.value,
    formattedValue: formatNumber(item.value),
    label: 'Members',
  }));
  const mrrChart: GhAreaChartDataItem[] = growthChart.map((item) => ({
    date: item.date,
    value: item.mrr / 100,
    formattedValue: `${CURRENCY}${formatNumber(item.mrr / 100)}`,
    label: 'MRR',
  }));
  const paidSubscriptionChanges = growthChart.map((item) => ({
    date: item.date,
    paid_subscribed: item.paid_subscribed,
    paid_canceled: item.paid_canceled,
  }));

  /* Newsletters */

  const subscribers = offsets.map((offset) => ({
    date: isoDay(offset),
    value: subscribersOn(profile, offset),
  }));
  const sends = sendsOf(profile).filter((send) => send.offset <= first);
  const newsletterSends: AvgsDataItem[] = sends.map((send) => ({
    post_id: send.post.id,
    post_title: send.post.title,
    send_date: isoDay(send.offset),
    sent_to: send.sentTo,
    total_opens: send.opens,
    open_rate: send.openRate,
    total_clicks: send.clicks,
    click_rate: send.clickRate,
  }));
  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const newsletterTotals = {
    totalSubscribers: subscribersOn(profile, 0),
    avgOpenRate: average(sends.map((send) => send.openRate)),
    avgClickRate: average(sends.map((send) => send.clickRate)),
  };
  const latestSend = sends[0];
  const sentRadial: NewsletterRadialChartData[] = [
    {
      datatype: 'Sent',
      value: latestSend ? 1 : 0,
      fill: 'url(#gradientPurple)',
      color: 'var(--chart-purple)',
    },
  ];
  // Gradient fills as the real screens pass them; the Admin 7 analytics
  // style draws each ring in `color` instead
  const openedRadial: NewsletterRadialChartData[] = [
    {
      datatype: 'Average',
      value: newsletterTotals.avgOpenRate,
      fill: 'url(#gradientGray)',
      color: 'var(--chart-gray)',
    },
    {
      datatype: 'This newsletter',
      value: latestSend?.openRate ?? 0,
      fill: 'url(#gradientBlue)',
      color: 'var(--chart-blue)',
    },
  ];
  const clickedRadial: NewsletterRadialChartData[] = [
    {
      datatype: 'Average',
      value: newsletterTotals.avgClickRate,
      fill: 'url(#gradientGray)',
      color: 'var(--chart-gray)',
    },
    {
      datatype: 'This newsletter',
      value: latestSend?.clickRate ?? 0,
      fill: 'url(#gradientTeal)',
      color: 'var(--chart-teal)',
    },
  ];
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  const radialLabels = {
    sent: latestSend ? '100%' : '0%',
    opened: percent(latestSend?.openRate ?? 0),
    clicked: percent(latestSend?.clickRate ?? 0),
  };

  /* Posts */

  const posts = postsOf(profile);
  const ranked = posts
    .map((post, index) => {
      const views = postViews(profile, post, index, offsets);
      return { post, views, members: postMembers(profile, views, post) };
    })
    .filter((row) => row.post.publishedOffset <= first || row.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
  const topPosts: { stats: TopPostViewsStats[] } = {
    stats: ranked.map(({ post, views, members }) => {
      const send = sends.find((item) => item.post.id === post.id);
      return {
        post_id: post.id,
        title: post.title,
        published_at: `${isoDay(post.publishedOffset)}T09:30:00.000Z`,
        feature_image: post.featureImage,
        status: send ? 'sent' : 'published',
        authors: post.author,
        views,
        sent_count: send?.sentTo ?? null,
        opened_count: send?.opens ?? null,
        open_rate: send?.openRate ?? null,
        clicked_count: send?.clicks ?? 0,
        click_rate: send?.clickRate ?? null,
        members: members.free + members.paid,
        free_members: members.free,
        paid_members: members.paid,
      };
    }),
  };

  const newest = posts[0];
  let latestPost: LatestPostWithStats | null = null;
  if (newest) {
    const views = postViews(profile, newest, 0, offsets);
    const members = postMembers(profile, views, newest);
    const send = sends.find((item) => item.post.id === newest.id);
    latestPost = {
      id: newest.id,
      uuid: newest.uuid,
      title: newest.title,
      slug: newest.slug,
      feature_image: newest.featureImage,
      published_at: `${isoDay(newest.publishedOffset)}T09:30:00.000Z`,
      url: `https://example.com/${newest.slug}/`,
      status: send ? 'sent' : 'published',
      email: send
        ? { opened_count: send.opens, email_count: send.sentTo, status: 'submitted' }
        : null,
      count: { clicks: send?.clicks ?? 0 },
      authors: [{ name: newest.author }],
      recipient_count: send?.sentTo ?? null,
      opened_count: send?.opens ?? null,
      open_rate: send?.openRate ?? null,
      member_delta: members.free + members.paid,
      free_members: members.free,
      paid_members: members.paid,
      visitors: views,
      click_rate: send?.clickRate ?? null,
    };
  }

  // One post's own traffic, for the post analytics cards: a launch spike
  // that settles over the following days
  const postOffsets = offsets.filter((offset) => offset <= (newest?.publishedOffset ?? -1));
  const launch = newest ? Math.max(1, visitsOn(profile, newest.publishedOffset)) : 0;
  const postVisitorsChart: GhAreaChartDataItem[] = postOffsets.map((offset) => {
    const daysLive = (newest?.publishedOffset ?? 0) - offset;
    const value = Math.round(launch * 0.6 * Math.exp(-daysLive / 2.2));
    return { date: isoDay(offset), value, formattedValue: formatNumber(value), label: 'Visitors' };
  });
  const postVisitors = postVisitorsChart.reduce((sum, item) => sum + item.value, 0);
  const postSources: BaseSourceData[] = sourcesOf(postVisitors)
    .slice(0, 4)
    .map((row) => ({ source: row.name, visits: row.value }));

  return {
    webKpis,
    totalVisitors: visitors,
    visitorsChart,
    sources,
    locations,
    growthChart,
    growthTotals,
    membersChart,
    mrrChart,
    paidSubscriptionChanges,
    subscribers,
    newsletterSends,
    newsletterTotals,
    sentRadial,
    openedRadial,
    clickedRadial,
    radialLabels,
    topPosts,
    latestPost,
    postVisitorsChart,
    postVisitors,
    postSources,
  };
};

export type Fixtures = ReturnType<typeof buildFixtures>;

export const radialConfig = (label: string) => ({
  percentage: { label },
  Average: { label: 'Average' },
  'This newsletter': { label: 'This newsletter' },
});
