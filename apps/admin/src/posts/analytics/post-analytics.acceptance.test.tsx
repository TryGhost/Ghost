import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

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
const EMAIL_ID = '64d623b64676110001e897ab';

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function seededPost(overrides: Partial<ReturnType<typeof post>> = {}) {
  return post({
    id: POST_ID,
    uuid: POST_UUID,
    title: 'Attack of the Clones',
    slug: 'attack-of-the-clones',
    status: 'published',
    visibility: 'public',
    published_at: `${daysAgo(10)}T10:00:00.000Z`,
    url: 'https://example.com/attack-of-the-clones/',
    email: { id: EMAIL_ID, email_count: 1000, opened_count: 400, status: 'submitted' },
    count: { clicks: 60, positive_feedback: 0, negative_feedback: 0 },
    newsletter: { id: NEWSLETTER_ID },
    ...overrides,
  });
}

function fakeSubmittingBatches(batches: Array<{ id: string; status: string }> = []) {
  return fakeAdminEndpoint('GET', new RegExp(`^/emails/${EMAIL_ID}/batches/(?:\\?|$)`), {
    batches,
  });
}

/**
 * The world every post-analytics tab reads: the routed post, its growth
 * stats (referrers/growth/mrr feed both the overview and the growth tab),
 * and the Tinybird KPI + active-visitors pipes. Tab-specific endpoints are
 * declared per test.
 */
function seedPostAnalyticsWorld(
  postOverrides: Partial<ReturnType<typeof post>> = {},
  postResponse: Parameters<typeof fakePosts>[0] = [seededPost(postOverrides)],
) {
  const postsApi = fakePosts(postResponse);
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
  const linksApi = fakeAdminEndpoint('GET', /^\/links\//, {
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
    linksApi,
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
  it('shows sending progress and withholds newsletter figures with the URL override', async () => {
    const postOverrides = {
      email: { id: EMAIL_ID, email_count: 0, opened_count: 0, status: 'submitting' },
    } as const;
    let postRequestCount = 0;
    const { linksApi, postsApi } = seedPostAnalyticsWorld(postOverrides, () => {
      postRequestCount += 1;
      return [
        seededPost(
          postRequestCount === 1
            ? postOverrides
            : {
                email: {
                  id: EMAIL_ID,
                  email_count: 1000,
                  opened_count: 400,
                  status: 'submitted',
                },
              },
        ),
      ];
    });
    let detailedPostRequestCount = 0;
    const detailedPostsApi = fakeAdminEndpoint('GET', new RegExp(`^/posts/${POST_ID}/`), () => {
      detailedPostRequestCount += 1;
      return {
        posts: [
          seededPost(
            detailedPostRequestCount === 1
              ? postOverrides
              : {
                  email: {
                    id: EMAIL_ID,
                    email_count: 1000,
                    opened_count: 400,
                    status: 'submitted',
                  },
                  count: { clicks: 60, positive_feedback: 0, negative_feedback: 0 },
                },
          ),
        ],
      };
    });
    let basicStatsRequestCount = 0;
    const basicStatsApi = fakeAdminEndpoint('GET', /^\/stats\/newsletter-basic-stats\//, () => {
      basicStatsRequestCount += 1;
      return {
        stats:
          basicStatsRequestCount === 1
            ? []
            : [
                {
                  post_id: POST_ID,
                  post_title: 'Attack of the Clones',
                  send_date: `${daysAgo(10)}T10:00:00.000Z`,
                  sent_to: 1000,
                  total_opens: 400,
                  open_rate: 0.4,
                },
              ],
        meta: {},
      };
    });
    const clickStatsApi = fakeAdminEndpoint('GET', /^\/stats\/newsletter-click-stats\//, () => {
      return {
        stats: [
          {
            post_id: POST_ID,
            total_clicks: 60,
            click_rate: 0.06,
            email_count: 1000,
          },
        ],
        meta: {},
      };
    });
    let statusRequestCount = 0;
    let completeSending = false;
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, () => {
      statusRequestCount += 1;
      return {
        email_statuses: [
          {
            id: EMAIL_ID,
            sending: !completeSending
              ? {
                  status: 'submitting',
                  progress: { completed: 500, total: 1000, estimated_seconds_remaining: 30 },
                }
              : {
                  status: 'submitted',
                  progress: { completed: 1000, total: 1000, estimated_seconds_remaining: 0 },
                },
          },
        ],
      };
    });

    await renderAdminApp(`/posts/analytics/${POST_ID}?labs=improveSendingUI`, {
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(page.getByText('Sending emails')).toBeVisible();
    await expect.element(page.getByText(/500 of 1,000/)).toBeVisible();
    await expect.element(page.getByText('This newsletter is still sending')).toBeVisible();
    await expect.element(postAnalyticsScreen.uniqueVisitors()).toHaveTextContent('250');

    await postAnalyticsScreen.newsletterTab().click();
    await expect.poll(currentRoute).toBe(`/posts/analytics/${POST_ID}/newsletter`);
    await expect.element(page.getByText('Newsletter clicks')).not.toBeInTheDocument();
    await expect
      .element(page.getByText('Sends, opens and clicks will appear once every email has been sent'))
      .toBeVisible();
    await expect.element(page.getByRole('button', { name: /View members/ }).first()).toBeDisabled();

    completeSending = true;
    const pendingStatusRequestCount = statusRequestCount;
    await expect
      .poll(() => statusRequestCount, { timeout: 3500 })
      .toBeGreaterThan(pendingStatusRequestCount);
    await expect.element(page.getByTestId('email-sending-status-banner')).not.toBeInTheDocument();
    await expect.poll(() => postsApi.requests.length).toBeGreaterThan(1);
    await expect.poll(() => detailedPostsApi.requests.length).toBeGreaterThan(1);
    await expect.poll(() => basicStatsApi.requests.length).toBeGreaterThan(1);
    await expect.poll(() => clickStatsApi.requests.length).toBeGreaterThan(0);
    await expect.poll(() => linksApi.requests.length).toBeGreaterThan(1);
    await expect.element(page.getByText('1,000').first()).toBeVisible();
    await expect.element(page.getByText('400').first()).toBeVisible();
    await expect.element(page.getByRole('button', { name: /View members/ }).first()).toBeEnabled();
  });

  it('moves a failed send and its retry action into the banner', async () => {
    const postOverrides = {
      email: {
        id: EMAIL_ID,
        email_count: 250,
        opened_count: 0,
        status: 'failed',
        error: 'Mailgun rejected the batch.',
      },
    } as const;
    seedPostAnalyticsWorld(postOverrides);
    fakeSubmittingBatches();
    let statusRequestCount = 0;
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, () => {
      statusRequestCount += 1;
      return {
        email_statuses: [
          {
            id: EMAIL_ID,
            sending:
              statusRequestCount === 1
                ? {
                    status: 'failed',
                    failed_during: 'submitting',
                    progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
                  }
                : statusRequestCount === 2
                  ? {
                      status: 'submitting',
                      progress: { completed: 250, total: 1000, estimated_seconds_remaining: 30 },
                    }
                  : {
                      status: 'submitted',
                      progress: { completed: 1000, total: 1000, estimated_seconds_remaining: 0 },
                    },
          },
        ],
      };
    });
    const retryApi = fakeAdminEndpoint('PUT', `/emails/${EMAIL_ID}/retry/`, {
      emails: [{ id: EMAIL_ID, email_count: 250, opened_count: 0, status: 'submitting' }],
    });

    await renderAdminApp(`/posts/analytics/${POST_ID}`, {
      labs: { improveSendingUI: true },
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(page.getByText('Some emails failed to send')).toBeVisible();
    await expect.element(page.getByText(/Mailgun rejected the batch/)).toBeVisible();
    await expect.element(page.getByText('No newsletter data available')).toBeVisible();

    await page.getByRole('button', { name: 'Send remaining emails' }).click();
    await expect.poll(() => retryApi.requests.length).toBe(1);
    await expect.element(page.getByText('Sending emails')).toBeVisible();
    await expect.poll(() => statusRequestCount, { timeout: 3500 }).toBeGreaterThan(2);
    await expect.element(page.getByTestId('email-sending-status-banner')).not.toBeInTheDocument();
  });

  it('shows a generic failure without retry when a batch has an unknown delivery outcome', async () => {
    seedPostAnalyticsWorld({
      email: {
        id: EMAIL_ID,
        email_count: 250,
        opened_count: 0,
        status: 'failed',
        error: 'An error occurred, and your newsletter was only partially sent.',
      },
    });
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, {
      email_statuses: [
        {
          id: EMAIL_ID,
          sending: {
            status: 'failed',
            failed_during: 'submitting',
            progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
          },
        },
      ],
    });
    const batchesApi = fakeSubmittingBatches([{ id: 'batch-1', status: 'submitting' }]);

    await renderAdminApp(`/posts/analytics/${POST_ID}`, {
      labs: { improveSendingUI: true },
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(page.getByText('Emails failed to send')).toBeVisible();
    await expect
      .element(page.getByText('Something went wrong while sending this email.'))
      .toBeVisible();
    await expect.element(page.getByText(/only partially sent/)).not.toBeInTheDocument();
    await expect
      .element(
        page
          .getByTestId('email-sending-status-banner')
          .getByRole('button', { name: /send|retry/i }),
      )
      .not.toBeInTheDocument();
    await expect
      .poll(() =>
        new URL(batchesApi.lastRequest?.url ?? 'http://localhost').searchParams.get('filter'),
      )
      .toBe('status:submitting');
    const batchRequestUrl = new URL(batchesApi.lastRequest!.url);
    expect(batchRequestUrl.searchParams.get('fields')).toBe('id,status');
    expect(batchRequestUrl.searchParams.get('limit')).toBe('1');
  });

  it('refreshes the failure reason and does not count prepared recipients as sent', async () => {
    const postOverrides = {
      email: { id: EMAIL_ID, email_count: 0, opened_count: 0, status: 'submitting' },
    } as const;
    let postRequestCount = 0;
    const { postsApi } = seedPostAnalyticsWorld(postOverrides, () => {
      postRequestCount += 1;
      return [
        seededPost(
          postRequestCount === 1
            ? postOverrides
            : {
                email: {
                  id: EMAIL_ID,
                  email_count: 0,
                  opened_count: 0,
                  status: 'failed',
                  error: 'Preparation failed.',
                },
              },
        ),
      ];
    });
    fakeSubmittingBatches();
    let statusRequestCount = 0;
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, () => {
      statusRequestCount += 1;
      return {
        email_statuses: [
          {
            id: EMAIL_ID,
            sending:
              statusRequestCount === 1
                ? {
                    status: 'preparing',
                    progress: { completed: 100, total: 1000, estimated_seconds_remaining: 30 },
                  }
                : {
                    status: 'failed',
                    failed_during: 'preparing',
                    progress: {
                      completed: 250,
                      total: 1000,
                      estimated_seconds_remaining: null,
                    },
                  },
          },
        ],
      };
    });

    await renderAdminApp(`/posts/analytics/${POST_ID}`, {
      labs: { improveSendingUI: true },
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(page.getByText('Preparing emails')).toBeVisible();
    await expect.poll(() => statusRequestCount, { timeout: 3500 }).toBeGreaterThan(1);
    await expect.poll(() => postsApi.requests.length).toBeGreaterThan(1);
    await expect.element(page.getByText('Emails failed to send')).toBeVisible();
    await expect
      .element(page.getByText(/None of the 1,000 emails were sent\. Preparation failed\./))
      .toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Retry sending email' })).toBeVisible();
  });

  it('falls back to the production analytics UI when the status endpoint is unavailable', async () => {
    seedPostAnalyticsWorld({
      email: { id: EMAIL_ID, email_count: 1000, opened_count: 400, status: 'submitting' },
    });
    const statusApi = fakeAdminEndpoint(
      'GET',
      `/emails/${EMAIL_ID}/status/`,
      { errors: [{ message: 'Resource not found' }] },
      { status: 404 },
    );

    const app = await renderAdminApp(`/posts/analytics/${POST_ID}`, {
      labs: { improveSendingUI: true },
      boot: webAnalyticsBootOverrides(),
    });

    await expect.element(page.getByText('Newsletter performance')).toBeVisible();
    await expect
      .element(page.getByText('This newsletter is still sending'))
      .not.toBeInTheDocument();
    await expect.element(page.getByTestId('email-sending-status-banner')).not.toBeInTheDocument();
    await expect.poll(() => statusApi.requests.length).toBe(1);
    await app.unmount();
  });

  it('applies the Admin 7 chrome on post analytics', async () => {
    seedPostAnalyticsWorld();
    await renderAdminApp(`/posts/analytics/${POST_ID}`, {
      labs: { admin7PageChrome: true, improveSendingUI: false },
      boot: webAnalyticsBootOverrides(),
    });
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
    await renderAdminApp(`/posts/analytics/${POST_ID}`, {
      labs: { improveSendingUI: false },
      boot: webAnalyticsBootOverrides(),
    });

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
