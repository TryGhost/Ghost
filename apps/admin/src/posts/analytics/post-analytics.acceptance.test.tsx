import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import type { ConfigResponse } from '@tryghost/test-data';

import {
  currentRoute,
  fakeAdminStats,
  fakeAdminEndpoint,
  fakeMembers,
  fakePosts,
  fakeTinybirdPipe,
  fakeTinybirdToken,
  post,
  renderAdminApp,
  settingsResponse,
  webAnalyticsBootOverrides,
} from '@test-utils/acceptance';
import { membersScreen } from '@/members/members.screen';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { postAnalyticsScreen } from './post-analytics.screen';

const POST_ID = '64d623b64676110001e897d9';
const POST_UUID = '0d5cea22-f4d5-4b23-a0f7-1d9c46ae5f2a';
const NEWSLETTER_ID = '64d623b64676110001e897aa';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function seededPost() {
  return post({
    id: POST_ID,
    uuid: POST_UUID,
    title: 'Attack of the Clones',
    slug: 'attack-of-the-clones',
    status: 'published',
    visibility: 'public',
    published_at: `${daysAgo(10)}T10:00:00.000Z`,
    url: 'https://example.com/attack-of-the-clones/',
    email: { email_count: 1000, opened_count: 400, status: 'submitted' },
    count: { clicks: 60, positive_feedback: 0, negative_feedback: 0 },
    newsletter: { id: NEWSLETTER_ID },
  });
}

/**
 * The world every post-analytics tab reads: the routed post, its growth
 * stats (referrers/growth/mrr feed both the overview and the growth tab),
 * and the Tinybird KPI + active-visitors pipes. Tab-specific endpoints are
 * declared per test.
 */
function seedPostAnalyticsWorld() {
  const postsApi = fakePosts([seededPost()]);
  fakeAdminStats.postReferrers(POST_ID, [
    {
      source: 'Google',
      referrer_url: 'https://google.com',
      free_members: 80,
      paid_members: 20,
      mrr: 1000,
    },
  ]);
  fakeAdminStats.postGrowth(POST_ID, { free_members: 100, paid_members: 25, mrr: 1250 });
  fakeAdminStats.mrr({
    stats: [{ date: daysAgo(1), mrr: 50000 }],
    totals: [{ currency: 'usd', mrr: 50000 }],
  });
  fakeAdminEndpoint('GET', /^\/links\//, {
    links: [
      {
        post_id: POST_ID,
        link: {
          link_id: 'link-1',
          from: '/r/abc',
          to: 'https://example.com/subscribe',
          edited: false,
        },
        count: { clicks: 10 },
      },
    ],
    meta: {},
  });
  fakeTinybirdToken();
  fakeTinybirdPipe('api_active_visitors', [{ active_visitors: 3 }]);
  const topSourcesApi = fakeTinybirdPipe('api_top_sources', [
    { source: 'google.com', visits: 170 },
  ]);
  const topLocationsApi = fakeTinybirdPipe('api_top_locations', [{ location: 'US', visits: 200 }]);
  return {
    postsApi,
    topSourcesApi,
    topLocationsApi,
    kpisApi: fakeTinybirdPipe('api_kpis', [
      { date: daysAgo(2), visits: 100 },
      { date: daysAgo(1), visits: 150 },
    ]),
  };
}

/**
 * The world for a freshly published post with no activity at all: no visits,
 * no attributed members, no link clicks — the empty states every tab shows.
 * The post never went out as an email, so no newsletter endpoints fire.
 */
function seedEmptyPostAnalyticsWorld() {
  fakePosts([
    post({
      id: POST_ID,
      uuid: POST_UUID,
      title: 'Attack of the Clones',
      slug: 'attack-of-the-clones',
      status: 'published',
      visibility: 'public',
      published_at: `${daysAgo(1)}T10:00:00.000Z`,
      url: 'https://example.com/attack-of-the-clones/',
    }),
  ]);
  fakeAdminStats.postReferrers(POST_ID);
  fakeAdminStats.postGrowth(POST_ID);
  fakeAdminStats.mrr();
  fakeAdminEndpoint('GET', /^\/links\//, { links: [], meta: {} });
  fakeTinybirdToken();
  fakeTinybirdPipe('api_active_visitors', []);
  fakeTinybirdPipe('api_kpis', []);
  fakeTinybirdPipe('api_top_sources', []);
  fakeTinybirdPipe('api_top_locations', []);
}

describe('Post analytics overview', () => {
  it('applies the Admin 7 chrome on post analytics', async () => {
    seedPostAnalyticsWorld();
    const boot = webAnalyticsBootOverrides();
    const config = boot.browseConfig?.response as ConfigResponse;
    config.config.labs = { ...config.config.labs, admin7PageChrome: true };

    await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot });
    await expect.element(postAnalyticsScreen.postTitle('Attack of the Clones')).toBeVisible();
    await expect.poll(() => document.querySelector('#root .admin7')).not.toBeNull();
  });

  it('renders the seeded post with web and growth sections', async () => {
    const { postsApi } = seedPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot: webAnalyticsBootOverrides() });

    await expect.element(postAnalyticsScreen.postTitle('Attack of the Clones')).toBeVisible();
    await expect(postsApi).toHaveSentFilter(`id:${POST_ID}`);
    await expect
      .element(sidebarScreen.navLink('Analytics'))
      .toHaveAttribute('aria-current', 'page');
    await expect.element(sidebarScreen.navLink('Posts')).not.toHaveAttribute('aria-current');

    // Web performance: visitors summed from the Tinybird rows.
    await expect.element(postAnalyticsScreen.webPerformanceCard()).toBeVisible();
    await expect.element(postAnalyticsScreen.uniqueVisitors()).toHaveTextContent('250');

    // Growth: totals from the post growth stats.
    await expect.element(postAnalyticsScreen.growthCard()).toHaveTextContent('Free members');
    await expect.element(postAnalyticsScreen.growthCard()).toHaveTextContent('100');
  });

  it('keeps the post context when switching to the web tab', async () => {
    const { kpisApi } = seedPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot: webAnalyticsBootOverrides() });

    await expect.element(postAnalyticsScreen.postTitle('Attack of the Clones')).toBeVisible();
    await expect.element(postAnalyticsScreen.uniqueVisitors()).toHaveTextContent('250');
    const overviewKpiRequestCount = kpisApi.requests.length;

    await postAnalyticsScreen.webTrafficTab().click();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}/web`);
    await expect.element(postAnalyticsScreen.locationsCard()).toBeVisible();
    // Same routed post: the header stays, and the KPI queries stay scoped to it.
    await expect.element(postAnalyticsScreen.postTitle('Attack of the Clones')).toBeVisible();
    await expect.poll(() => kpisApi.requests.length).toBeGreaterThan(overviewKpiRequestCount);
    await expect.poll(() => kpisApi.lastRequest?.params.get('post_uuid')).toBe(POST_UUID);
  });

  it('renders every tab and zeroed sections for a post with no activity', async () => {
    seedEmptyPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot: webAnalyticsBootOverrides() });

    await expect.element(postAnalyticsScreen.overviewTab()).toBeVisible();
    await expect.element(postAnalyticsScreen.webTrafficTab()).toBeVisible();
    await expect.element(postAnalyticsScreen.growthTab()).toBeVisible();

    await expect.element(postAnalyticsScreen.growthCard()).toHaveTextContent('Free members');
    await expect.element(postAnalyticsScreen.growthCard()).toHaveTextContent('0');
  });

  it('reaches the empty web traffic view through web performance view more', async () => {
    seedEmptyPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot: webAnalyticsBootOverrides() });

    await postAnalyticsScreen.webPerformanceViewMoreButton().click();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}/web`);
    // No visits at all: the web view renders its whole-view empty state.
    await expect.element(page.getByText('No visitors in the last 30 days').first()).toBeVisible();
  });

  it('reaches the empty growth view through growth view more', async () => {
    seedEmptyPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot: webAnalyticsBootOverrides() });

    await postAnalyticsScreen.growthViewMoreButton().click();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}/growth`);
    await expect
      .element(postAnalyticsScreen.topSourcesCard())
      .toHaveTextContent('No sources data available');
  });

  it('hides the growth tab and section when member source tracking is off', async () => {
    seedEmptyPostAnalyticsWorld();
    const boot = webAnalyticsBootOverrides();
    boot.browseSettings = {
      response: settingsResponse({
        settings: { web_analytics_enabled: true, members_track_sources: false },
      }),
    };
    await renderAdminApp(`/posts/analytics/${POST_ID}`, { boot });

    await expect.element(postAnalyticsScreen.overviewTab()).toBeVisible();
    await expect.element(postAnalyticsScreen.webTrafficTab()).toBeVisible();
    await expect.element(postAnalyticsScreen.growthTab()).not.toBeInTheDocument();
    await expect.element(postAnalyticsScreen.growthCard()).not.toBeInTheDocument();
  });
});

describe('Post analytics web', () => {
  it('renders the seeded KPIs, locations and sources', async () => {
    const { topSourcesApi, topLocationsApi } = seedPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}/web`, { boot: webAnalyticsBootOverrides() });

    await expect.element(postAnalyticsScreen.postTitle('Attack of the Clones')).toBeVisible();
    await expect
      .element(page.getByRole('tab', { name: 'Unique visitors' }))
      .toHaveTextContent('250');
    await expect.element(postAnalyticsScreen.locationRow('US')).toHaveTextContent('United States');
    await expect.element(postAnalyticsScreen.sourceRow('google.com')).toHaveTextContent('170');
    await expect.poll(() => topLocationsApi.lastRequest?.params.get('post_uuid')).toBe(POST_UUID);
    await expect.poll(() => topSourcesApi.lastRequest?.params.get('post_uuid')).toBe(POST_UUID);
  });

  it('filters the post analytics pipes when a location row is clicked', async () => {
    const { kpisApi, topLocationsApi, topSourcesApi } = seedPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}/web`, { boot: webAnalyticsBootOverrides() });

    await expect.element(postAnalyticsScreen.locationRow('US')).toHaveTextContent('United States');
    const initialKpiRequestCount = kpisApi.requests.length;
    const initialLocationsRequestCount = topLocationsApi.requests.length;
    const initialSourcesRequestCount = topSourcesApi.requests.length;

    await postAnalyticsScreen.locationRow('US').click();

    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}/web?location=US`);
    await expect.element(postAnalyticsScreen.filterContainer()).toHaveTextContent('Location');
    await expect.poll(() => kpisApi.requests.length).toBeGreaterThan(initialKpiRequestCount);
    await expect
      .poll(() => topLocationsApi.requests.length)
      .toBeGreaterThan(initialLocationsRequestCount);
    await expect
      .poll(() => topSourcesApi.requests.length)
      .toBeGreaterThan(initialSourcesRequestCount);
    expect(kpisApi.lastRequest?.params.get('location')).toBe('US');
    expect(topLocationsApi.lastRequest?.params.get('location')).toBe('US');
    expect(topSourcesApi.lastRequest?.params.get('location')).toBe('US');
  });
});

describe('Post analytics growth', () => {
  it('renders the seeded member totals and top sources', async () => {
    seedPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}/growth`, {
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(postAnalyticsScreen.membersCard()).toHaveTextContent('Free members');
    await expect.element(postAnalyticsScreen.membersCard()).toHaveTextContent('100');
    await expect.element(page.getByText('Top sources')).toBeVisible();
    await expect.element(page.getByText('Google')).toBeVisible();
  });

  it('renders the zeroed members card and empty sources when nothing converted', async () => {
    seedEmptyPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}/growth`, {
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(postAnalyticsScreen.membersCard()).toHaveTextContent('Free members');
    await expect.element(postAnalyticsScreen.membersCard()).toHaveTextContent('0');
    await expect
      .element(postAnalyticsScreen.topSourcesCard())
      .toHaveTextContent('No sources data available');
  });

  it('links the members KPI to the members list filtered to this post', async () => {
    seedEmptyPostAnalyticsWorld();
    const membersApi = fakeMembers([]);
    // The filter bar resolves attribution ids to post/page titles.
    fakeAdminEndpoint('GET', /^\/pages\//, {
      pages: [],
      meta: { pagination: { page: 1, limit: 25, pages: 1, total: 0, next: null, prev: null } },
    });
    await renderAdminApp(`/posts/analytics/${POST_ID}/growth`, {
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(postAnalyticsScreen.membersCard()).toHaveTextContent('Free members');
    await postAnalyticsScreen.freeMembersViewMembersButton().click();

    // The members screen re-serializes the handed-over filter clauses.
    await expect.poll(currentRoute).toMatch(/^\/members\?/);
    await expect(membersApi).toHaveSentFilter(`conversion:-'${POST_ID}'+signup:'${POST_ID}'`);
    await expect.element(membersScreen.noResults()).toBeVisible();
  });
});

describe('Post analytics newsletter', () => {
  it('renders the seeded email performance', async () => {
    seedPostAnalyticsWorld();
    fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/`), { posts: [seededPost()] });
    const basicStats = {
      post_id: POST_ID,
      post_title: 'Attack of the Clones',
      send_date: `${daysAgo(10)}T10:00:00.000Z`,
      sent_to: 1000,
      total_opens: 400,
    };
    fakeAdminStats.newsletterBasic([basicStats]);
    fakeAdminStats.newsletterClicks([
      {
        post_id: POST_ID,
        total_clicks: 60,
        email_count: 1000,
      },
    ]);
    await renderAdminApp(`/posts/analytics/${POST_ID}/newsletter`, {
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(postAnalyticsScreen.postTitle('Attack of the Clones')).toBeVisible();
    // The funnel KPI labels also appear inside the radial chart's svg; take the KPI card's.
    await expect.element(page.getByText('Sent', { exact: true }).first()).toBeVisible();
    await expect.element(page.getByText('1,000').first()).toBeVisible();
    await expect.element(page.getByText('400').first()).toBeVisible();
  });
});
