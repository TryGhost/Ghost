import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  comment,
  currentRoute,
  fakeAdminEndpoint,
  fakeComments,
  fakeMembers,
  fakePages,
  fakePosts,
  member,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';
import { commentsScreen } from './comments.screen';

const labs = { commentsAnalytics: true };

const totals = (comments: number, commenters: number, reported: number) => ({
  comments,
  commenters,
  reported,
});

const overview = {
  stats: [
    {
      totals: totals(12, 7, 2),
      previous_totals: totals(10, 7, 1),
      interval: 'day',
      series: [
        { date: '2026-11-15', ...totals(5, 4, 1) },
        { date: '2026-11-16', ...totals(7, 5, 1) },
      ],
    },
  ],
};

function fakeCommentsStats(overviewResponse: Parameters<typeof fakeAdminEndpoint>[2] = overview) {
  const overviewApi = fakeAdminEndpoint('GET', /^\/stats\/comments\/\?/, overviewResponse);
  const topPostsApi = fakeAdminEndpoint('GET', /^\/stats\/comments\/top-posts\/\?/, {
    stats: topPosts.map(({ id, title }, index) => ({ post_id: id, title, comments: 10 - index })),
  });
  const topCommentersApi = fakeAdminEndpoint('GET', /^\/stats\/comments\/top-commenters\/\?/, {
    stats: [
      { member_id: 'member1', name: 'Regular Reader', comments: 4 },
      { member_id: 'member2', name: null, comments: 2 },
    ],
  });
  return { overviewApi, topPostsApi, topCommentersApi };
}

const topPosts = Array.from({ length: 7 }, (_, index) =>
  post({ id: `post${index}`, title: `Popular post ${index + 1}` }),
);

/** The list's filter chips look up post and member names for the ids a panel click applies. */
function fakeFilterLookups() {
  fakePosts(topPosts);
  fakePages([]);
  fakeMembers([member({ id: 'member1', name: 'Regular Reader' })]);
}

const requestedDays = (url: string) => {
  const params = new URL(url).searchParams;
  return (Date.parse(params.get('date_to')!) - Date.parse(params.get('date_from')!)) / 86400000 + 1;
};

afterEach(async () => {
  await page.viewport(1280, 800);
});

describe('Comments analytics', () => {
  it('shows totals, trends and the top posts and commenters beside the list', async () => {
    fakeComments([comment({ html: '<p>A comment</p>' })]);
    const { overviewApi } = fakeCommentsStats();
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.commentRow('A comment')).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');
    await expect.element(commentsScreen.analyticsKpiValue('commenters')).toHaveTextContent('7');
    await expect.element(commentsScreen.analyticsKpiValue('reported')).toHaveTextContent('2');
    await expect.element(commentsScreen.analyticsKpiTrend('comments')).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiTrend('reported')).toBeVisible();
    // Unchanged from the previous period
    await expect.element(commentsScreen.analyticsKpiTrend('commenters')).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsTopPosts()).toHaveTextContent('Popular post 1');
    await expect
      .element(commentsScreen.analyticsTopCommenters())
      .toHaveTextContent('Unknown member');
    // The rail sits beside the list on wide screens, so there is no button to open it
    await expect.element(commentsScreen.analyticsButton()).not.toBeInTheDocument();

    expect(requestedDays(overviewApi.requests[0].url)).toBe(30);
    expect(new URL(overviewApi.requests[0].url).searchParams.get('timezone')).toBeTruthy();
  });

  it('requests the selected range and keeps the range and tab in the URL', async () => {
    fakeComments([comment()]);
    const { overviewApi } = fakeCommentsStats();
    await renderAdminApp('/comments', { labs });

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('Last 7 days').click();

    await expect.poll(() => requestedDays(overviewApi.requests.at(-1)!.url)).toBe(7);
    await expect.poll(currentRoute).toContain('range=7');

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('All time').click();

    // Core starts all time at the first comment
    await expect.poll(currentRoute).toContain('range=1000');
    await expect
      .poll(() => new URL(overviewApi.requests.at(-1)!.url).searchParams.has('date_from'))
      .toBe(false);

    await commentsScreen.analyticsKpiTab('Reported').click();

    await expect.poll(currentRoute).toContain('tab=reported');
    await expect
      .element(commentsScreen.analyticsKpiTab('Reported'))
      .toHaveAttribute('aria-selected', 'true');
  });

  it('shows no figures from the previous range while the new one loads', async () => {
    fakeComments([comment()]);
    let release = () => {};
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { topPostsApi, topCommentersApi } = fakeCommentsStats(async ({ url }) => {
      if (requestedDays(url) !== 1) {
        return overview;
      }
      await released;
      return { stats: [{ ...overview.stats[0], totals: totals(3, 2, 0) }] };
    });
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('Today').click();

    await expect.poll(() => topPostsApi.requests.length).toBe(2);
    await expect.poll(() => topCommentersApi.requests.length).toBe(2);
    await expect.element(commentsScreen.analyticsKpiValue('comments')).not.toHaveTextContent('12');

    release();

    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('3');
  });

  it('filters the list to a top post or commenter, one at a time', async () => {
    const commentsApi = fakeComments([comment()]);
    fakeCommentsStats();
    fakeFilterLookups();
    await renderAdminApp('/comments', { labs });

    await commentsScreen.analyticsTopPosts().row('Popular post 1').click();

    await expect(commentsApi).toHaveSentFilter(/^post_id:'?post0'?$/);

    await commentsScreen.analyticsTopCommenters().row('Regular Reader').click();

    // The commenter replaces the post filter rather than narrowing it
    await expect(commentsApi).toHaveSentFilter(/^member_id:'?member1'?$/);
  });

  it('lists the top 25 in a sheet from View all', async () => {
    const commentsApi = fakeComments([comment()]);
    fakeCommentsStats();
    fakeFilterLookups();
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsTopPosts()).toHaveTextContent('Popular post 5');
    await expect
      .element(commentsScreen.analyticsTopPosts().row('Popular post 6'))
      .not.toBeInTheDocument();

    await commentsScreen.analyticsTopPosts().viewAll().click();

    await expect
      .element(commentsScreen.analyticsTopPostsSheet().row('Popular post 7'))
      .toBeVisible();

    await commentsScreen.analyticsTopPostsSheet().row('Popular post 7').click();

    await expect.element(commentsScreen.analyticsTopPostsSheet()).not.toBeInTheDocument();
    await expect(commentsApi).toHaveSentFilter(/^post_id:'?post6'?$/);
  });

  it('scrolls the rail with the page rather than on its own', async () => {
    fakeComments([comment()]);
    fakeCommentsStats();
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsPanel()).toBeVisible();

    const scrollers = [];
    for (
      let el = commentsScreen.analyticsPanel().element().parentElement;
      el;
      el = el.parentElement
    ) {
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY)) {
        scrollers.push(el);
      }
    }
    expect(scrollers).toHaveLength(1);
  });

  it('opens the panel from the header on narrower screens', async () => {
    await page.viewport(1000, 800);
    const commentsApi = fakeComments([comment()]);
    const { overviewApi, topPostsApi, topCommentersApi } = fakeCommentsStats();
    fakeFilterLookups();
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsButton()).toBeVisible();
    // Nothing is fetched behind the closed sheet
    expect(
      [overviewApi, topPostsApi, topCommentersApi].map(({ requests }) => requests.length),
    ).toEqual([0, 0, 0]);

    await commentsScreen.analyticsButton().click();

    await expect.element(commentsScreen.analyticsSheet()).toBeVisible();
    await expect.element(commentsScreen.analyticsPanel()).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');

    await commentsScreen.analyticsTopCommenters().row('Regular Reader').click();

    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect(commentsApi).toHaveSentFilter(/^member_id:'?member1'?$/);
  });

  it('hides itself when Core has no comments stats endpoint', async () => {
    fakeComments([comment({ html: '<p>Still listed</p>' })]);
    const notFound = { errors: [{ message: 'Resource not found', type: 'NotFoundError' }] };
    fakeAdminEndpoint('GET', /^\/stats\/comments\//, notFound, { status: 404 });
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.commentRow('Still listed')).toBeVisible();
    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsButton()).not.toBeInTheDocument();
    await expect.element(commentsScreen.errorMessage()).not.toBeInTheDocument();
  });

  it('shows a retry for other errors', async () => {
    fakeComments([comment()]);
    const stats = {
      totals: totals(0, 0, 0),
      previous_totals: totals(0, 0, 0),
      interval: 'day',
      series: [],
    };
    fakeAdminEndpoint('GET', /^\/stats\/comments\/\?/, { stats: [stats] });
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-commenters\/\?/, { stats: [] });
    const invalid = { errors: [{ message: 'Validation error', type: 'ValidationError' }] };
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-posts\/\?/, invalid, { status: 422 });
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsPanel()).toBeVisible();
    await expect.element(commentsScreen.analyticsError()).toBeVisible();
    await expect.element(commentsScreen.analyticsRetryButton()).toBeVisible();
  });

  it('stays off without the labs flag', async () => {
    // No stats fakes: a request would be served a 418 and fail the test
    fakeComments([comment({ html: '<p>Plain list</p>' })]);
    await renderAdminApp('/comments');

    await expect.element(commentsScreen.commentRow('Plain list')).toBeVisible();
    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
  });
});
