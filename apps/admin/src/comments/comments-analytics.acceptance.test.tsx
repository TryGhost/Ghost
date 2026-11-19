import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

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
  settingsResponse,
} from '@test-utils/acceptance';
import { commentsScreen } from './comments.screen';
import { deferred } from '@/utils/deferred';

const labs = { commentsAnalytics: true };

const totals = (comments: number, commenters: number, reported: number) => ({
  comments,
  commenters,
  reported,
});

const overview = {
  meta: { filters: true },
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
    meta: { filters: true },
    stats: topPosts.map(({ id, title }, index) => ({ post_id: id, title, comments: 10 - index })),
  });
  const topCommentersApi = fakeAdminEndpoint('GET', /^\/stats\/comments\/top-commenters\/\?/, {
    meta: { filters: true },
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

const requestedFilter = (api: ReturnType<typeof fakeAdminEndpoint>) =>
  api.lastRequest ? new URL(api.lastRequest.url).searchParams.get('filter') : undefined;

const requestedDays = (url: string) => {
  const params = new URL(url).searchParams;
  return (Date.parse(params.get('date_to')!) - Date.parse(params.get('date_from')!)) / 86400000 + 1;
};

afterEach(async () => {
  await page.viewport(1280, 800);
});

describe('Comments analytics', () => {
  it('defaults to All time and shows totals and rankings beside the list', async () => {
    fakeComments([comment({ html: '<p>A comment</p>' })]);
    const { overviewApi } = fakeCommentsStats();
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.commentRow('A comment')).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');
    await expect.element(commentsScreen.analyticsKpiValue('commenters')).toHaveTextContent('7');
    await expect.element(commentsScreen.analyticsKpiValue('reported')).toHaveTextContent('2');
    // All time has no previous period to compare.
    await expect.element(commentsScreen.analyticsKpiTrend('comments')).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsKpiTrend('reported')).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsKpiTrend('commenters')).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsTopPosts()).toHaveTextContent('Popular post 1');
    await expect
      .element(commentsScreen.analyticsTopCommenters())
      .toHaveTextContent('Unknown member');
    // The rail sits beside the list on wide screens, so there is no button to open it
    await expect.element(commentsScreen.analyticsButton()).not.toBeInTheDocument();

    expect(new URL(overviewApi.requests[0].url).searchParams.has('date_from')).toBe(false);
    await expect.element(commentsScreen.analyticsDateRange()).toHaveTextContent('All time');
    expect(new URL(overviewApi.requests[0].url).searchParams.get('timezone')).toBeTruthy();
  });

  it('shows comparison trends for an explicit range', async () => {
    fakeComments([comment()]);
    fakeCommentsStats();
    await renderAdminApp('/comments?range=30', { labs });

    await expect.element(commentsScreen.analyticsKpiTrend('comments')).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiTrend('reported')).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiTrend('commenters')).not.toBeInTheDocument();
  });

  it('places the shared date control above both columns and removes Date from the filter menu', async () => {
    fakeComments([comment({ html: '<p>Below the page header</p>' })]);
    fakeCommentsStats();
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsPanel()).toBeVisible();
    await expect.element(commentsScreen.commentRow('Below the page header')).toBeVisible();
    const dateBounds = commentsScreen.analyticsDateRange().element().getBoundingClientRect();
    const analyticsBounds = commentsScreen.analyticsPanel().element().getBoundingClientRect();
    const commentBounds = commentsScreen
      .commentRow('Below the page header')
      .element()
      .getBoundingClientRect();
    expect(analyticsBounds.top).toBeGreaterThanOrEqual(dateBounds.bottom);
    expect(commentBounds.top).toBeGreaterThanOrEqual(dateBounds.bottom);

    await commentsScreen.filterButton().click();
    await expect.element(commentsScreen.filterFieldOption('Status')).toBeVisible();
    await expect.element(commentsScreen.filterFieldOption('Date')).not.toBeInTheDocument();
  });

  it('waits for the site timezone before fetching the shared date scope', async () => {
    const commentsApi = fakeComments([comment({ html: '<p>Listed after timezone resolves</p>' })]);
    const apis = fakeCommentsStats();
    const settingsLoaded = deferred<void>();
    await renderAdminApp('/comments', {
      labs,
      boot: {
        browseSettings: {
          response: async () => {
            await settingsLoaded.promise;
            return settingsResponse({ settings: { timezone: 'Asia/Tokyo' } });
          },
        },
      },
    });

    await expect.element(commentsScreen.analyticsDateRange()).toBeVisible();
    await expect
      .element(commentsScreen.commentRow('Listed after timezone resolves'))
      .not.toBeInTheDocument();
    expect(commentsApi.requests).toHaveLength(0);
    expect(apis.overviewApi.requests).toHaveLength(0);

    settingsLoaded.resolve();

    await expect.element(commentsScreen.commentRow('Listed after timezone resolves')).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');
    for (const api of Object.values(apis)) {
      expect(api.requests.map(({ url }) => new URL(url).searchParams.get('timezone'))).toEqual([
        'Asia/Tokyo',
      ]);
    }
  });

  it('requests the selected range and keeps the range and tab in the URL', async () => {
    const commentsApi = fakeComments([comment()]);
    const { overviewApi } = fakeCommentsStats(({ url }) => ({
      ...overview,
      stats: [
        {
          ...overview.stats[0],
          totals: new URL(url).searchParams.has('date_from') ? totals(3, 2, 0) : totals(12, 7, 2),
        },
      ],
    }));
    await renderAdminApp('/comments', { labs });

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('Last 7 days').click();

    await expect.poll(() => requestedDays(overviewApi.requests.at(-1)!.url)).toBe(7);
    await expect.poll(currentRoute).toContain('range=7');
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('3');

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('All time').click();

    // Core starts all time at the first comment
    await expect.poll(currentRoute).toContain('range=1000');
    // The initial All time result can be reused from the query cache.
    await expect.element(commentsScreen.analyticsDateRange()).toHaveTextContent('All time');
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');

    const statsRequests = overviewApi.requests.length;
    await commentsScreen.analyticsKpiTab('Reported').click();

    await expect.poll(currentRoute).toContain('tab=reported');
    await expect
      .element(commentsScreen.analyticsKpiTab('Reported'))
      .toHaveAttribute('aria-selected', 'true');
    expect(commentsApi.lastRequest?.filter).not.toContain('count.reports');
    expect(new URL(overviewApi.requests.at(-1)!.url).searchParams.has('filter')).toBe(false);
    expect(overviewApi.requests).toHaveLength(statsRequests);
  });

  it('shares the filter and date scope while metric tabs only change the chart', async () => {
    const commentsApi = fakeComments([comment()]);
    const statsApis = fakeCommentsStats();
    const filter = 'status:hidden+count.reports:>0';
    await renderAdminApp(`/comments?range=7&filter=${encodeURIComponent(filter)}`, { labs });

    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');
    await expect(commentsApi).toHaveSentFilter(/status:hidden/);
    await expect(commentsApi).toHaveSentFilter(/count\.reports:>0/);
    await expect(commentsApi).toHaveSentFilter(/created_at:/);
    for (const api of Object.values(statsApis)) {
      await expect.poll(() => requestedFilter(api)).toMatch(/status:hidden/);
      await expect.poll(() => requestedFilter(api)).toMatch(/count\.reports:>0/);
      expect(requestedDays(api.requests.at(-1)!.url)).toBe(7);
    }

    const listFilter = commentsApi.lastRequest?.filter;
    const statsRequests = Object.values(statsApis).map(({ requests }) => requests.length);
    await commentsScreen.analyticsKpiTab('Reported').click();
    await expect
      .element(commentsScreen.analyticsKpiTab('Reported'))
      .toHaveAttribute('aria-selected', 'true');
    await expect.poll(currentRoute).toContain('tab=reported');
    expect(commentsApi.lastRequest?.filter).toBe(listFilter);
    expect(Object.values(statsApis).map(({ requests }) => requests.length)).toEqual(statsRequests);

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('Last 30 days').click();
    for (const api of Object.values(statsApis)) {
      await expect.poll(() => requestedDays(api.requests.at(-1)!.url)).toBe(30);
      await expect.poll(() => requestedFilter(api)).toMatch(/status:hidden/);
      await expect.poll(() => requestedFilter(api)).toMatch(/count\.reports:>0/);
    }
    await expect
      .element(commentsScreen.analyticsKpiTab('Reported'))
      .toHaveAttribute('aria-selected', 'true');
    await expect(commentsApi).toHaveSentFilter(/status:hidden/);
    await expect(commentsApi).toHaveSentFilter(/count\.reports:>0/);
  });

  it('applies inclusive custom dates in the site timezone across daylight saving time', async () => {
    const commentsApi = fakeComments([comment()]);
    const statsApis = fakeCommentsStats();
    await renderAdminApp('/comments?filter=status:hidden', {
      labs,
      boot: {
        browseSettings: {
          response: settingsResponse({ settings: { timezone: 'America/New_York' } }),
        },
      },
    });

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('Custom range').click();
    await commentsScreen.customDateRangeStart().fill('2026-03-08');
    await commentsScreen.customDateRangeEnd().fill('2026-03-08');
    await commentsScreen.applyCustomDateRangeButton().click();

    await expect.element(commentsScreen.customDateRangeDialog()).not.toBeInTheDocument();
    await expect.poll(currentRoute).toContain('range=custom');
    await expect.poll(currentRoute).toContain('date_from=2026-03-08');
    await expect.poll(currentRoute).toContain('date_to=2026-03-08');
    await expect(commentsApi).toHaveSentFilter(/status:hidden/);
    await expect(commentsApi).toHaveSentFilter(/created_at:>='2026-03-08T05:00:00\.000Z'/);
    await expect(commentsApi).toHaveSentFilter(/created_at:<'2026-03-09T04:00:00\.000Z'/);
    for (const api of Object.values(statsApis)) {
      await expect
        .poll(() => new URL(api.requests.at(-1)!.url).searchParams.get('date_from'))
        .toBe('2026-03-08');
      expect(new URL(api.requests.at(-1)!.url).searchParams.get('date_to')).toBe('2026-03-08');
      expect(new URL(api.requests.at(-1)!.url).searchParams.get('timezone')).toBe(
        'America/New_York',
      );
      await expect.poll(() => requestedFilter(api)).toMatch(/status:hidden/);
    }

    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('All time').click();
    await expect(commentsApi).toHaveSentFilter(/status:hidden/);
    await expect(commentsApi).toHaveSentFilter(/created_at:/);
    await expect.poll(currentRoute).not.toContain('date_from=');
    await expect.poll(currentRoute).not.toContain('date_to=');
  });

  it.each([
    { key: '{Enter}', label: 'Enter' },
    { key: ' ', label: 'Space' },
  ])('reopens the selected custom range with $label', async ({ key }) => {
    fakeComments([comment()]);
    fakeCommentsStats();
    await renderAdminApp('/comments?range=custom&date_from=2026-03-01&date_to=2026-03-07', {
      labs,
    });

    await commentsScreen.analyticsDateRange().click();
    await expect
      .element(commentsScreen.analyticsDateRangeOption('Custom range'))
      .toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard(`{End}${key}`);

    await expect.element(commentsScreen.customDateRangeDialog()).toBeVisible();
    await expect.element(commentsScreen.customDateRangeStart()).toHaveValue('2026-03-01');
    await expect.element(commentsScreen.customDateRangeEnd()).toHaveValue('2026-03-07');
  });

  it('replaces a legacy Date filter when selecting the shared range and preserves other filters', async () => {
    const commentsApi = fakeComments([comment()]);
    const statsApis = fakeCommentsStats();
    const legacyFilter = "created_at:>='2025-01-01T00:00:00.000Z'+status:hidden";
    await renderAdminApp(`/comments?filter=${encodeURIComponent(legacyFilter)}`, { labs });

    await expect(commentsApi).toHaveSentFilter(/created_at:>='2025-01-01T00:00:00\.000Z'/);
    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('Last 7 days').click();

    await expect
      .poll(() => new URLSearchParams(currentRoute().split('?')[1]).get('filter'))
      .toBe('status:hidden');
    await expect(commentsApi).toHaveSentFilter(/status:hidden/);
    await expect.poll(() => commentsApi.lastRequest?.filter).not.toContain('2025-01-01');
    for (const api of Object.values(statsApis)) {
      await expect.poll(() => requestedFilter(api)).toBe('status:hidden');
      await expect.poll(() => requestedDays(api.requests.at(-1)!.url)).toBe(7);
    }
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
      return { ...overview, stats: [{ ...overview.stats[0], totals: totals(3, 2, 0) }] };
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

  it('progressively narrows both list and analytics to a top post and commenter', async () => {
    const commentsApi = fakeComments([comment()]);
    const statsApis = fakeCommentsStats();
    fakeFilterLookups();
    await renderAdminApp('/comments', { labs });

    await commentsScreen.analyticsTopPosts().row('Popular post 1').click();

    await expect(commentsApi).toHaveSentFilter(/post_id:'?post0'?/);

    await commentsScreen.analyticsTopCommenters().row('Regular Reader').click();

    await expect(commentsApi).toHaveSentFilter(/member_id:'?member1'?/);
    await expect(commentsApi).toHaveSentFilter(/post_id:'?post0'?/);
    for (const api of Object.values(statsApis)) {
      await expect.poll(() => requestedFilter(api)).toMatch(/member_id:'?member1'?/);
      await expect.poll(() => requestedFilter(api)).toMatch(/post_id:'?post0'?/);
    }
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
    await expect(commentsApi).toHaveSentFilter(/post_id:'?post6'?/);
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
    await renderAdminApp('/comments?range=7', { labs });

    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsButton()).toBeVisible();
    // Nothing is fetched behind the closed sheet
    expect(
      [overviewApi, topPostsApi, topCommentersApi].map(({ requests }) => requests.length),
    ).toEqual([0, 0, 0]);

    await expect.element(commentsScreen.analyticsDateRange()).toHaveTextContent('Last 7 days');
    const originalFilter = commentsApi.lastRequest?.filter;
    await commentsScreen.analyticsDateRange().click();
    await commentsScreen.analyticsDateRangeOption('Last 30 days').click();
    await expect.poll(() => commentsApi.lastRequest?.filter).not.toBe(originalFilter);
    expect(overviewApi.requests).toHaveLength(0);

    await commentsScreen.analyticsButton().click();

    await expect.element(commentsScreen.analyticsSheet()).toBeVisible();
    await expect.element(commentsScreen.analyticsPanel()).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');
    for (const api of [overviewApi, topPostsApi, topCommentersApi]) {
      expect(requestedDays(api.requests.at(-1)!.url)).toBe(30);
    }
    await expect
      .element(commentsScreen.analyticsSheet().getByRole('combobox', { name: 'Date range' }))
      .not.toBeInTheDocument();

    await commentsScreen.analyticsTopCommenters().row('Regular Reader').click();

    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect(commentsApi).toHaveSentFilter(/member_id:'?member1'?/);
  });

  it('keeps zero analytics visible for an empty filtered list and resets the shared scope', async () => {
    const entity = comment({ html: '<p>Visible after resetting</p>' });
    const commentsApi = fakeComments(({ filter }) =>
      filter?.includes('status:hidden') ? [] : [entity],
    );
    const zero = totals(0, 0, 0);
    fakeAdminEndpoint('GET', /^\/stats\/comments\/\?/, {
      meta: { filters: true },
      stats: [{ totals: zero, previous_totals: zero, interval: 'day', series: [] }],
    });
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-posts\/\?/, {
      meta: { filters: true },
      stats: [],
    });
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-commenters\/\?/, {
      meta: { filters: true },
      stats: [],
    });
    await renderAdminApp('/comments?range=7&filter=status:hidden', { labs });

    await expect.element(commentsScreen.filteredEmptyState()).toBeVisible();
    await expect.element(commentsScreen.analyticsPanel()).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('0');
    await expect.element(commentsScreen.analyticsKpiValue('commenters')).toHaveTextContent('0');
    await expect.element(commentsScreen.analyticsKpiValue('reported')).toHaveTextContent('0');
    await commentsScreen.resetFiltersButton().click();

    await expect.element(commentsScreen.commentRow('Visible after resetting')).toBeVisible();
    await expect.element(commentsScreen.analyticsDateRange()).toHaveTextContent('All time');
    await expect.poll(() => commentsApi.lastRequest?.filter).not.toContain('status:hidden');
  });

  it('hides analytics when an older Core endpoint cannot apply filters', async () => {
    const commentsApi = fakeComments([comment({ html: '<p>Still filtered</p>' })]);
    const markerless = { stats: overview.stats };
    fakeAdminEndpoint('GET', /^\/stats\/comments\/\?/, markerless);
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-posts\/\?/, { stats: [] });
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-commenters\/\?/, { stats: [] });
    await renderAdminApp('/comments?filter=status:hidden', { labs });

    await expect.element(commentsScreen.commentRow('Still filtered')).toBeVisible();
    await expect.element(commentsScreen.analyticsDateRange()).toBeVisible();
    await expect(commentsApi).toHaveSentFilter(/status:hidden/);
    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsButton()).not.toBeInTheDocument();
    await expect.element(commentsScreen.errorMessage()).not.toBeInTheDocument();
  });

  it('refreshes every analytics query after moderation changes the filtered set', async () => {
    let entity = comment({ html: '<p>Moderated comment</p>' });
    let hidden = false;
    fakeComments(() => (hidden ? [] : [entity]));
    const statsApis = fakeCommentsStats(() => ({
      ...overview,
      stats: [{ ...overview.stats[0], totals: hidden ? totals(0, 0, 0) : totals(1, 1, 0) }],
    }));
    const hideApi = fakeAdminEndpoint('PUT', `/comments/${entity.id}/`, () => {
      hidden = true;
      entity = { ...entity, status: 'hidden' };
      return { comments: [entity] };
    });
    await renderAdminApp('/comments?filter=status:published', { labs });

    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('1');
    const requestsBefore = Object.values(statsApis).map(({ requests }) => requests.length);
    await commentsScreen
      .commentRow('Moderated comment')
      .getByRole('button', { name: 'Hide', exact: true })
      .click();

    await expect.poll(() => hideApi.requests.length).toBe(1);
    await expect.element(commentsScreen.filteredEmptyState()).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('0');
    for (const [index, api] of Object.values(statsApis).entries()) {
      await expect.poll(() => api.requests.length).toBeGreaterThan(requestsBefore[index]);
      await expect.poll(() => requestedFilter(api)).toMatch(/status:published/);
    }
  });

  it('refreshes analytics after disabling a member and hiding their previous comments', async () => {
    const author = { ...member({ name: 'Reader under moderation' }), can_comment: true };
    let hidden = false;
    const entity = comment({
      html: '<p>Hidden with the member’s previous comments</p>',
      member: author,
      member_id: author.id,
    });
    fakeComments(() => (hidden ? [] : [entity]));
    const statsApis = fakeCommentsStats(() => ({
      ...overview,
      stats: [{ ...overview.stats[0], totals: hidden ? totals(0, 0, 0) : totals(1, 1, 0) }],
    }));
    const disableApi = fakeAdminEndpoint(
      'POST',
      `/members/${author.id}/commenting/disable`,
      ({ body }) => {
        hidden = (body as { hide_comments?: boolean }).hide_comments === true;
        author.can_comment = false;
        return { members: [author] };
      },
    );
    await renderAdminApp('/comments?filter=status:published', { labs });

    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('1');
    const requestsBefore = Object.values(statsApis).map(({ requests }) => requests.length);
    await commentsScreen
      .commentRow('Hidden with the member’s previous comments')
      .moreMenuButton()
      .click();
    await commentsScreen.disableCommentingMenuItem().click();
    const dialog = commentsScreen.disableCommentsDialog();
    await dialog.getByRole('checkbox', { name: 'Hide all previous comments' }).click();
    await dialog.getByRole('button', { name: 'Disable comments', exact: true }).click();

    await expect
      .poll(() => disableApi.lastRequest?.body)
      .toEqual({
        reason: `Disabled from comment ${entity.id}`,
        hide_comments: true,
      });
    await expect.element(commentsScreen.filteredEmptyState()).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('0');
    await expect.element(commentsScreen.analyticsKpiValue('commenters')).toHaveTextContent('0');
    await expect.element(commentsScreen.analyticsKpiValue('reported')).toHaveTextContent('0');
    for (const [index, api] of Object.values(statsApis).entries()) {
      await expect.poll(() => api.requests.length).toBeGreaterThan(requestsBefore[index]);
      await expect.poll(() => requestedFilter(api)).toMatch(/status:published/);
    }
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
    fakeAdminEndpoint('GET', /^\/stats\/comments\/\?/, { meta: { filters: true }, stats: [stats] });
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-commenters\/\?/, {
      meta: { filters: true },
      stats: [],
    });
    const invalid = { errors: [{ message: 'Validation error', type: 'ValidationError' }] };
    fakeAdminEndpoint('GET', /^\/stats\/comments\/top-posts\/\?/, invalid, { status: 422 });
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsPanel()).toBeVisible();
    await expect.element(commentsScreen.analyticsError()).toBeVisible();
    await expect.element(commentsScreen.analyticsRetryButton()).toBeVisible();
  });

  it('stays off without the labs flag', async () => {
    // No stats fakes: a request would be served a 418 and fail the test
    const commentsApi = fakeComments([comment({ html: '<p>Plain list</p>' })]);
    await renderAdminApp('/comments?range=7');

    await expect.element(commentsScreen.commentRow('Plain list')).toBeVisible();
    expect(commentsApi.lastRequest?.filter).toBeUndefined();
    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsDateRange()).not.toBeInTheDocument();
    await commentsScreen.filterButton().click();
    await expect.element(commentsScreen.filterFieldOption('Date')).toBeVisible();
  });
});
