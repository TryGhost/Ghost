import { describe, expect, it } from 'vitest';

import {
  TINYBIRD_SITE_UUID,
  currentRoute,
  fakeAdminStats,
  fakeAnalyticsOverview,
  fakeNewsletters,
  fakePosts,
  fakeTinybirdPipe,
  fakeTinybirdToken,
  newsletter,
  post,
  renderAdminApp,
  webAnalyticsBootOverrides,
} from '@test-utils/acceptance';
import { deferred } from '@/utils/deferred';
import { analyticsScreen } from './analytics.screen';

const LATEST_POST_ID = '64d623b64676110001e897d1';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * The world every stats view reads: growth history and the latest-post lookup
 * from the Admin API, visitor KPIs and the header's active-visitors probe
 * from Tinybird. View-specific endpoints are declared per test.
 */
function seedAnalyticsWorld() {
  fakeAdminStats.memberCount({
    stats: [
      { date: daysAgo(2), free: 100, paid: 40, comped: 5, paid_subscribed: 2 },
      { date: daysAgo(1), free: 120, paid: 50, comped: 5, paid_subscribed: 3, paid_canceled: 1 },
    ],
    totals: { free: 120, paid: 50, comped: 5, gift: 0 },
  });
  fakeAdminStats.mrr({
    stats: [
      { date: daysAgo(2), mrr: 40000 },
      { date: daysAgo(1), mrr: 50000 },
    ],
    totals: [{ currency: 'usd', mrr: 50000 }],
  });
  fakeAdminStats.subscriptions();
  const postsApi = fakePosts([
    post({
      id: LATEST_POST_ID,
      title: 'Attack of the Clones',
      status: 'published',
      published_at: `${daysAgo(3)}T10:00:00.000Z`,
      url: 'https://example.com/attack-of-the-clones/',
      email: { email_count: 1000, opened_count: 400, status: 'submitted' },
      count: { clicks: 50, positive_feedback: 0, negative_feedback: 0 },
    }),
  ]);
  fakeAdminStats.post(LATEST_POST_ID, {
    recipient_count: 1000,
    opened_count: 400,
    free_members: 10,
    paid_members: 2,
    visitors: 300,
  });
  fakeTinybirdToken();
  fakeTinybirdPipe('api_active_visitors', [{ active_visitors: 12 }]);
  return {
    postsApi,
    kpisApi: fakeTinybirdPipe('api_kpis', [
      { date: daysAgo(2), visits: 100 },
      { date: daysAgo(1), visits: 150 },
    ]),
  };
}

function seedTopPostsViews() {
  fakeAdminStats.topPostViews([
    {
      post_id: LATEST_POST_ID,
      title: 'A Popular Post',
      published_at: `${daysAgo(5)}T10:00:00.000Z`,
      authors: 'Ann Author',
      views: 240,
      free_members: 12,
    },
  ]);
}

describe('Analytics overview', () => {
  it('renders zero KPIs when growth history is empty', async () => {
    fakeAnalyticsOverview();
    await renderAdminApp('/analytics');

    await expect.element(analyticsScreen.membersValue()).toHaveTextContent(/^0$/);
    await expect.element(analyticsScreen.mrrValue()).toHaveTextContent(/^\$0$/);
  });

  it('renders the seeded KPIs, latest post and top posts', async () => {
    const { postsApi } = seedAnalyticsWorld();
    seedTopPostsViews();
    await renderAdminApp('/analytics', { boot: webAnalyticsBootOverrides() });

    // Headline KPIs: visitors summed from the Tinybird rows, members from
    // the member-count totals, MRR from the mrr history.
    await expect.element(analyticsScreen.uniqueVisitorsValue()).toHaveTextContent('250');
    await expect.element(analyticsScreen.membersValue()).toHaveTextContent('175');
    await expect.element(analyticsScreen.mrrValue()).toHaveTextContent('$500');

    // Chart region inside the visitors KPI card.
    await expect
      .poll(() => analyticsScreen.uniqueVisitorsCard().element().querySelector('svg'))
      .not.toBeNull();

    await expect.element(analyticsScreen.latestPost()).toHaveTextContent('Attack of the Clones');
    await expect(postsApi).toHaveSentFilter('status:[published,sent]');
    expect(postsApi.lastRequest).toMatchObject({ order: 'published_at DESC', limit: 1 });
    await expect.element(analyticsScreen.topPostsCard()).toHaveTextContent('A Popular Post');

    // The header's active-visitors probe (Tinybird) resolved.
    await expect.element(analyticsScreen.activeVisitors()).toHaveTextContent('12 online');
  });

  it('re-queries Tinybird when the date range changes', async () => {
    const { kpisApi } = seedAnalyticsWorld();
    seedTopPostsViews();
    await renderAdminApp('/analytics', { boot: webAnalyticsBootOverrides() });

    await expect.element(analyticsScreen.uniqueVisitorsValue()).toHaveTextContent('250');
    const initialDateFrom = kpisApi.lastRequest?.params.get('date_from');
    expect(initialDateFrom).toBeTruthy();
    expect(kpisApi.lastRequest?.params.get('site_uuid')).toBe(TINYBIRD_SITE_UUID);

    await analyticsScreen.dateRangeSelect().click();
    await analyticsScreen.rangeOption('Last 7 days').click();

    await expect.element(analyticsScreen.dateRangeSelect()).toHaveTextContent('Last 7 days');
    await expect.poll(() => kpisApi.lastRequest?.params.get('date_from')).not.toBe(initialDateFrom);
  });
});

describe('Analytics web traffic', () => {
  it('stays on the Web route while settings load, then renders seeded analytics', async () => {
    const boot = webAnalyticsBootOverrides();
    const settings = boot.browseSettings?.response;
    const pendingSettings = deferred<unknown>();
    boot.browseSettings = {
      response: () => pendingSettings.promise,
    };
    seedAnalyticsWorld();
    seedTopPostsViews();
    fakeAdminStats.topContent([
      {
        pathname: '/attack-of-the-clones/',
        title: 'Attack of the Clones',
        visits: 240,
        post_id: LATEST_POST_ID,
        post_type: 'post',
      },
    ]);
    fakeTinybirdPipe('api_top_sources', [{ source: 'google.com', visits: 170 }]);
    fakeTinybirdPipe('api_top_locations', [{ location: 'US', visits: 200 }]);

    try {
      await renderAdminApp('/analytics/web', { boot });

      // Prove the lazy route renders while settings are still unresolved.
      // Resolving settings only after this assertion makes the ordering
      // deterministic instead of relying on an arbitrary response delay.
      await expect.element(analyticsScreen.dateRangeSelect()).toBeVisible();
      await expect.poll(currentRoute).toBe('/analytics/web');
    } finally {
      pendingSettings.resolve(settings);
    }

    await expect
      .element(analyticsScreen.webGraph().getByRole('tab', { name: 'Unique visitors' }))
      .toHaveTextContent('250');

    await expect
      .element(analyticsScreen.topContentCard())
      .toHaveTextContent('Attack of the Clones');
    await expect.element(analyticsScreen.sourceRow('google.com')).toHaveTextContent('170');
    await expect.element(analyticsScreen.locationRow('US')).toHaveTextContent('United States');
  });
});

describe('Analytics growth', () => {
  it('renders the seeded member growth and top content', async () => {
    seedAnalyticsWorld();
    fakeAdminStats.topPosts([
      {
        post_id: LATEST_POST_ID,
        attribution_url: '/attack-of-the-clones/',
        attribution_type: 'post',
        attribution_id: LATEST_POST_ID,
        title: 'Attack of the Clones',
        free_members: 30,
        paid_members: 5,
        mrr: 500,
        published_at: `${daysAgo(3)}T10:00:00.000Z`,
      },
    ]);
    await renderAdminApp('/analytics/growth', { boot: webAnalyticsBootOverrides() });

    await expect
      .element(analyticsScreen.totalMembersCard().getByRole('tab', { name: 'Total members' }))
      .toHaveTextContent('175');
    await expect
      .element(analyticsScreen.topContentCard())
      .toHaveTextContent('Attack of the Clones');
    await expect.element(analyticsScreen.topContentCard()).toHaveTextContent('+30');
  });
});

describe('Analytics newsletters', () => {
  it('renders the seeded subscriber KPIs and top newsletters', async () => {
    seedAnalyticsWorld();
    fakeNewsletters([
      newsletter({
        name: 'Weekly Digest',
        status: 'active',
        sort_order: 0,
        count: { posts: 3, active_members: 543 },
      }),
    ]);
    fakeAdminStats.newsletterSubscribers({
      total: 543,
      values: [
        { date: daysAgo(2), value: 520 },
        { date: daysAgo(1), value: 543 },
      ],
    });
    const basicStats = {
      post_id: LATEST_POST_ID,
      post_title: 'Weekly Digest Issue #1',
      send_date: `${daysAgo(3)}T10:00:00.000Z`,
      sent_to: 1000,
      total_opens: 300,
    };
    fakeAdminStats.newsletterBasic([basicStats]);
    fakeAdminStats.newsletterClicks([
      {
        post_id: LATEST_POST_ID,
        total_clicks: 50,
        email_count: 1000,
      },
    ]);
    await renderAdminApp('/analytics/newsletters', { boot: webAnalyticsBootOverrides() });

    await expect.element(analyticsScreen.newslettersCard()).toBeVisible();
    await expect.element(analyticsScreen.totalSubscribersValue()).toHaveTextContent('543');
    await expect
      .element(analyticsScreen.topNewslettersCard())
      .toHaveTextContent('Weekly Digest Issue #1');
  });
});
