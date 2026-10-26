import { type BaseSourceData } from '@tryghost/admin-x-framework';
import { type GhAreaChartDataItem } from '@tryghost/shade/patterns';
import { type TopPostViewsStats } from '@tryghost/admin-x-framework/api/stats';
import { formatNumber } from '@tryghost/shade/utils';
import { type AvgsDataItem } from '@/analytics/views/stats/newsletters/newsletters';
import { type KpiDataItem } from '@/analytics/views/stats/web/components/web-kpis';
import { type LatestPostWithStats } from '@/analytics/hooks/use-latest-post-stats';
import { type NewsletterRadialChartData } from '@/posts/analytics/newsletter/components/newsletter-radial-chart';

// Sample data for the patterns page: a healthy mid-sized publication over the
// last 30 days. Shaped exactly like what each component gets from its real
// query, so the page shows the real components, not lookalikes. Deterministic,
// so a screenshot today matches one tomorrow (apart from the dates).

export const RANGE = 30;
export const CURRENCY = '$';

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};

// Oldest first, ending today.
const DATES = Array.from({ length: RANGE }, (_, index) => day(RANGE - 1 - index));

// A smooth, repeatable wobble with a weekly dip, so charts look like traffic
// rather than noise.
const wobble = (index: number, base: number, amount: number) => {
  const weekly = new Date(DATES[index]).getDay() % 6 === 0 ? 0.72 : 1;
  const drift = Math.sin(index / 2.6) * 0.18 + Math.sin(index / 7.1) * 0.12;
  return Math.max(0, Math.round(base * weekly * (1 + drift) + amount * Math.sin(index * 1.7)));
};

/* Web traffic
 * ------------------------------------------------------------------------ */

export const webKpis: KpiDataItem[] = DATES.map((date, index) => {
  const visits = wobble(index, 420, 40);
  return { date, visits, pageviews: Math.round(visits * 1.62) };
});

export const totalVisitors = webKpis.reduce((sum, item) => sum + Number(item.visits), 0);

export const visitorsChart: GhAreaChartDataItem[] = webKpis.map((item) => ({
  date: item.date,
  value: Number(item.visits),
  formattedValue: formatNumber(Number(item.visits)),
  label: 'Visitors',
}));

export const sources: BaseSourceData[] = [
  { source: 'google.com', visits: 4120 },
  { source: '', visits: 3310 },
  { source: 'bsky.app', visits: 1460 },
  { source: 'newsletter', visits: 1180 },
  { source: 'reddit.com', visits: 640 },
  { source: 'news.ycombinator.com', visits: 410 },
  { source: 'linkedin.com', visits: 260 },
];

export const locations = [
  { location: 'US', visits: 5210 },
  { location: 'GB', visits: 1840 },
  { location: 'DE', visits: 1120 },
  { location: 'CA', visits: 860 },
  { location: 'AU', visits: 640 },
  { location: 'NL', visits: 410 },
  { location: 'IT', visits: 290 },
];

/* Members and MRR
 * ------------------------------------------------------------------------ */

const FREE_START = 19_640;
const PAID_START = 1_208;

export const growthChart = DATES.map((date, index) => {
  const free = FREE_START + Math.round(index * 6.3 + Math.sin(index / 3) * 4);
  const paid = PAID_START + Math.round(index * 1.3);
  const mrr = paid * 520; // cents
  return {
    date,
    value: free + paid,
    free,
    paid,
    comped: 14,
    gift: 3,
    mrr,
    paid_subscribed: index % 4 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
    paid_canceled: index % 5 === 0 ? 2 : index % 7 === 0 ? 1 : 0,
    formattedValue: formatNumber(free + paid),
  };
});

const lastGrowth = growthChart[growthChart.length - 1];

export const growthTotals = {
  totalMembers: lastGrowth.free + lastGrowth.paid,
  freeMembers: lastGrowth.free,
  paidMembers: lastGrowth.paid,
  mrr: lastGrowth.mrr,
  percentChanges: { total: '0.9%', free: '0.9%', paid: '3.1%', mrr: '3.1%' },
  directions: { total: 'up', free: 'up', paid: 'up', mrr: 'up' } as const,
};

export const membersChart: GhAreaChartDataItem[] = growthChart.map((item) => ({
  date: item.date,
  value: item.free + item.paid,
  formattedValue: formatNumber(item.free + item.paid),
  label: 'Members',
}));

export const mrrChart: GhAreaChartDataItem[] = growthChart.map((item) => ({
  date: item.date,
  value: item.mrr / 100,
  formattedValue: `${CURRENCY}${formatNumber(item.mrr / 100)}`,
  label: 'MRR',
}));

export const paidSubscriptionChanges = growthChart.map((item) => ({
  date: item.date,
  paid_subscribed: item.paid_subscribed,
  paid_canceled: item.paid_canceled,
}));

/* Newsletters
 * ------------------------------------------------------------------------ */

export const subscribers = DATES.map((date, index) => ({
  date,
  value: 16_880 + Math.round(index * 4.8),
}));

const SENDS: Array<[number, string, number, number]> = [
  [27, 'The slow web, revisited', 0.58, 0.11],
  [23, 'What we learned from a year of paid subscriptions', 0.54, 0.09],
  [18, 'Notes from the road: Lisbon', 0.61, 0.06],
  [13, 'Ask me anything, March edition', 0.49, 0.12],
  [8, 'The case for writing less often', 0.56, 0.08],
  [3, 'Sheet music for the algorithm era', 0.52, 0.1],
];

export const newsletterSends: AvgsDataItem[] = SENDS.map(
  ([offset, title, openRate, clickRate], index) => {
    const sentTo = 16_900 + index * 21;
    return {
      post_id: `pattern-post-${index}`,
      post_title: title,
      send_date: day(offset),
      sent_to: sentTo,
      total_opens: Math.round(sentTo * openRate),
      open_rate: openRate,
      total_clicks: Math.round(sentTo * clickRate),
      click_rate: clickRate,
    };
  },
);

export const newsletterTotals = {
  totalSubscribers: subscribers[subscribers.length - 1].value,
  avgOpenRate: 0.55,
  avgClickRate: 0.09,
};

export const sentRadial: NewsletterRadialChartData[] = [
  { datatype: 'Sent', value: 1, fill: 'url(#gradientPurple)', color: 'var(--chart-purple)' },
];

export const openedRadial: NewsletterRadialChartData[] = [
  { datatype: 'Average', value: 0.55, fill: 'url(#gradientGray)', color: 'var(--chart-gray)' },
  {
    datatype: 'This newsletter',
    value: 0.61,
    fill: 'url(#gradientBlue)',
    color: 'var(--chart-blue)',
  },
];

export const clickedRadial: NewsletterRadialChartData[] = [
  { datatype: 'Average', value: 0.09, fill: 'url(#gradientGray)', color: 'var(--chart-gray)' },
  {
    datatype: 'This newsletter',
    value: 0.12,
    fill: 'url(#gradientTeal)',
    color: 'var(--chart-teal)',
  },
];

export const radialConfig = (label: string) => ({
  percentage: { label },
  Average: { label: 'Average' },
  'This newsletter': { label: 'This newsletter' },
});

/* Posts
 * ------------------------------------------------------------------------ */

const IMAGES = [
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
  null,
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800',
];

export const latestPost: LatestPostWithStats = {
  id: 'pattern-latest',
  uuid: 'pattern-latest-uuid',
  title: 'Sheet music for the algorithm era',
  slug: 'sheet-music-for-the-algorithm-era',
  feature_image: IMAGES[0],
  published_at: `${day(1)}T09:30:00.000Z`,
  url: 'https://example.com/sheet-music-for-the-algorithm-era/',
  excerpt: 'Why the most-read pieces this year were the ones that took the longest to write.',
  status: 'sent',
  email: { opened_count: 9_120, email_count: 17_024, status: 'submitted' },
  count: { clicks: 1_310 },
  authors: [{ name: 'Aron Lemke' }],
  recipient_count: 17_024,
  opened_count: 9_120,
  open_rate: 0.536,
  member_delta: 42,
  free_members: 37,
  paid_members: 5,
  visitors: 1_428,
  click_rate: 0.077,
};

const POSTS: Array<[string, string, number, number]> = [
  ['Sheet music for the algorithm era', 'Aron Lemke', 1, 1_428],
  ['On working slowly in a world that rewards speed', 'Maren Calzoni', 6, 982],
  ['Half-finished thoughts on subscription pricing', 'Aron Lemke', 11, 615],
  ['A field guide to independent publishing', 'Maren Calzoni', 17, 422],
  ['The case for writing less often', 'Aron Lemke', 24, 384],
];

export const topPosts: { stats: TopPostViewsStats[] } = {
  stats: POSTS.map(([title, author, offset, views], index) => {
    const sent = index % 2 === 0;
    return {
      post_id: `pattern-top-${index}`,
      title,
      published_at: `${day(offset)}T09:30:00.000Z`,
      feature_image: IMAGES[index],
      status: sent ? 'sent' : 'published',
      authors: author,
      views,
      sent_count: sent ? 17_000 : null,
      opened_count: sent ? 9_100 - index * 300 : null,
      open_rate: sent ? 0.54 - index * 0.02 : null,
      clicked_count: sent ? 1_200 - index * 90 : 0,
      click_rate: sent ? 0.07 : null,
      members: Math.round(views / 34),
      free_members: Math.round(views / 40),
      paid_members: Math.max(0, Math.round(views / 34) - Math.round(views / 40)),
    };
  }),
};

// One post's own traffic, for the post analytics cards.
export const postVisitorsChart: GhAreaChartDataItem[] = DATES.slice(-12).map((date, index) => {
  const value = Math.round(620 * Math.exp(-index / 2.2)) + 6;
  return { date, value, formattedValue: formatNumber(value), label: 'Visitors' };
});

export const postSources: BaseSourceData[] = [
  { source: 'newsletter', visits: 640 },
  { source: '', visits: 380 },
  { source: 'bsky.app', visits: 220 },
  { source: 'google.com', visits: 120 },
];
