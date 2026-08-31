import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  TINYBIRD_SITE_UUID,
  currentRoute,
  fakeAdminEndpoint,
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

/**
 * The stats views' world with web analytics on but nothing recorded yet: a
 * site with no members, no MRR, no posts and no visits — the empty states.
 */
function seedEmptyAnalyticsWorld() {
  fakeAdminStats.memberCount();
  fakeAdminStats.mrr();
  fakeAdminStats.subscriptions();
  fakeAdminStats.topPostViews();
  fakePosts([]);
  fakeTinybirdToken();
  fakeTinybirdPipe('api_active_visitors', []);
  fakeTinybirdPipe('api_kpis', []);
}

/** The web traffic view's own cards, all empty. */
function seedEmptyWebTraffic() {
  fakeAdminStats.topContent([]);
  fakeTinybirdPipe('api_top_sources', []);
  fakeTinybirdPipe('api_top_locations', []);
}

/**
 * A member-count history of zero rows, the shape the server serves for a
 * site with no members — a fully empty history would collapse the growth
 * view into its no-stats state instead of rendering the empty cards.
 */
function seedZeroMemberHistory() {
  fakeAdminStats.memberCount({
    stats: [{ date: daysAgo(1), free: 0, paid: 0, comped: 0 }],
    totals: { free: 0, paid: 0, comped: 0, gift: 0 },
  });
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

  it('uses Admin 7 typography in the portalled trend tooltip', async () => {
    seedAnalyticsWorld();
    seedTopPostsViews();
    await renderAdminApp('/analytics', {
      labs: { admin7PageChrome: true },
      boot: webAnalyticsBootOverrides(),
    });
    await expect.element(analyticsScreen.membersValue()).toHaveTextContent('175');
    await expect.poll(() => document.querySelector('#root .admin7')).not.toBeNull();
    await analyticsScreen.membersCard().getByTestId('kpi-card-header-diff').hover();
    const tooltip = page.getByRole('tooltip');
    await expect.element(tooltip).toHaveTextContent(/trending/);
    expect(tooltip.element().closest('#root')).toBeNull();
    await expect
      .poll(() => getComputedStyle(tooltip.element()).fontFamily)
      .toContain('Inter Admin 7');
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

  it('renders the latest and top posts with zeroed stats when nothing is recorded', async () => {
    seedEmptyAnalyticsWorld();
    fakePosts([
      post({
        id: LATEST_POST_ID,
        title: 'Attack of the Clones',
        status: 'published',
        published_at: `${daysAgo(3)}T10:00:00.000Z`,
        url: 'https://example.com/attack-of-the-clones/',
      }),
    ]);
    fakeAdminStats.post(LATEST_POST_ID);
    // The server lists recently published posts in top posts even before
    // they record any views; the row must render its zeros as zeros.
    fakeAdminStats.topPostViews([
      {
        post_id: LATEST_POST_ID,
        title: 'Attack of the Clones',
        published_at: `${daysAgo(3)}T10:00:00.000Z`,
      },
    ]);
    await renderAdminApp('/analytics', { boot: webAnalyticsBootOverrides() });

    await expect.element(analyticsScreen.latestPost()).toHaveTextContent('Attack of the Clones');
    await expect.element(analyticsScreen.latestPostVisitors()).toHaveTextContent('0');
    await expect.element(analyticsScreen.latestPostMembers()).toHaveTextContent('0');

    await expect.element(analyticsScreen.topPostsCard()).toHaveTextContent('Attack of the Clones');
    const visitorsStatistics = analyticsScreen.topPostsVisitorsStatistics();
    await expect.element(visitorsStatistics).toHaveTextContent('Unique visitors');
    await expect.element(visitorsStatistics).toHaveTextContent('0');
    const membersStatistics = analyticsScreen.topPostsMembersStatistics();
    await expect.element(membersStatistics).toHaveTextContent('New members');
    await expect.element(membersStatistics).toHaveTextContent('Free');
    await expect.element(membersStatistics).toHaveTextContent('0');
  });

  it('navigates to the web traffic view from the visitors KPI', async () => {
    seedEmptyAnalyticsWorld();
    seedEmptyWebTraffic();
    await renderAdminApp('/analytics', { boot: webAnalyticsBootOverrides() });

    await analyticsScreen.uniqueVisitorsViewMoreButton().click();

    await expect.poll(currentRoute).toMatch(/^\/analytics\/web\/?$/);
    await expect.element(analyticsScreen.uniqueVisitorsTab()).toBeVisible();
  });

  it('navigates to the growth view from the members KPI', async () => {
    seedEmptyAnalyticsWorld();
    seedZeroMemberHistory();
    fakeAdminStats.topPosts();
    await renderAdminApp('/analytics', { boot: webAnalyticsBootOverrides() });

    await analyticsScreen.membersViewMoreButton().click();

    await expect.poll(currentRoute).toMatch(/^\/analytics\/growth\//);
    await expect.element(analyticsScreen.totalMembersCard()).toBeVisible();
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

  it('renders zeroed KPIs and empty cards when there are no visits', async () => {
    seedEmptyAnalyticsWorld();
    seedEmptyWebTraffic();
    await renderAdminApp('/analytics/web', { boot: webAnalyticsBootOverrides() });

    await expect.element(analyticsScreen.uniqueVisitorsTab()).toHaveTextContent('0');
    await expect.element(analyticsScreen.totalViewsTab()).toHaveTextContent('0');
    await expect.element(analyticsScreen.topContentCard()).toHaveTextContent('No visitors');
    await expect.element(analyticsScreen.topSourcesCard()).toHaveTextContent('No visitors');
    await expect.element(analyticsScreen.locationsCard()).toHaveTextContent('No visitors');
  });

  it('keeps the empty state across the top content tabs', async () => {
    seedEmptyAnalyticsWorld();
    seedEmptyWebTraffic();
    await renderAdminApp('/analytics/web', { boot: webAnalyticsBootOverrides() });

    await analyticsScreen.topContentTab('Posts').click();
    await expect.element(analyticsScreen.topContentCard()).toHaveTextContent('No visitors');

    await analyticsScreen.topContentTab('Pages').click();
    await expect.element(analyticsScreen.topContentCard()).toHaveTextContent('No visitors');
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

  it('shows No conversions across the top content tabs when nothing converted', async () => {
    seedEmptyAnalyticsWorld();
    seedZeroMemberHistory();
    fakeAdminStats.topPosts();
    fakeAdminEndpoint('GET', /^\/stats\/top-sources-growth/, { stats: [], meta: {} });
    await renderAdminApp('/analytics/growth', { boot: webAnalyticsBootOverrides() });

    const contentCard = analyticsScreen.topContentCard();
    await expect
      .element(contentCard)
      .toHaveTextContent('Which posts or pages drove the most growth in the last 30 days');
    await expect.element(contentCard).toHaveTextContent('No conversions');

    await analyticsScreen.topContentTab('Posts').click();
    await expect
      .element(contentCard)
      .toHaveTextContent('Which posts drove the most growth in the last 30 days');
    await expect.element(contentCard).toHaveTextContent('No conversions');

    await analyticsScreen.topContentTab('Pages').click();
    await expect
      .element(contentCard)
      .toHaveTextContent('Which pages drove the most growth in the last 30 days');
    await expect.element(contentCard).toHaveTextContent('No conversions');

    await analyticsScreen.topContentTab('Sources').click();
    await expect
      .element(contentCard)
      .toHaveTextContent('Which sources drove the most growth in the last 30 days');
    await expect.element(contentCard).toHaveTextContent('No conversions');
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

  it('shows the empty state on every newsletter card when none were sent', async () => {
    seedEmptyAnalyticsWorld();
    fakeNewsletters([newsletter({ name: 'Weekly Digest', status: 'active', sort_order: 0 })]);
    fakeAdminStats.newsletterSubscribers();
    fakeAdminStats.newsletterBasic();
    fakeAdminStats.newsletterClicks();
    await renderAdminApp('/analytics/newsletters', { boot: webAnalyticsBootOverrides() });

    await expect.element(analyticsScreen.newslettersCard()).toBeVisible();
    await expect
      .element(analyticsScreen.topNewslettersCard())
      .toHaveTextContent('newsletters in the last 30 days');

    await analyticsScreen.newslettersCardTab('Avg. open rate').click();
    await expect
      .element(analyticsScreen.newslettersCard())
      .toHaveTextContent('No newsletters in the last 30 days');

    await analyticsScreen.newslettersCardTab('Avg. click rate').click();
    await expect
      .element(analyticsScreen.newslettersCard())
      .toHaveTextContent('No newsletters in the last 30 days');
  });
});
