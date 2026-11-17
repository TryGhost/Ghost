import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  comment,
  currentRoute,
  fakeAdminEndpoint,
  fakeComments,
  renderAdminApp,
} from '@test-utils/acceptance';
import { commentsScreen } from './comments.screen';

const labs = { commentsAnalytics: true };

const totals = (comments: number, commenters: number, reported: number) => ({
  comments,
  commenters,
  reported,
});

function fakeCommentsStats() {
  const overviewApi = fakeAdminEndpoint('GET', /^\/stats\/comments\/\?/, {
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
  });
  const topPostsApi = fakeAdminEndpoint('GET', /^\/stats\/comments\/top-posts\/\?/, {
    stats: Array.from({ length: 7 }, (_, index) => ({
      post_id: `post${index}`,
      title: `Popular post ${index + 1}`,
      comments: 10 - index,
    })),
  });
  const topCommentersApi = fakeAdminEndpoint('GET', /^\/stats\/comments\/top-commenters\/\?/, {
    stats: [
      { member_id: 'member1', name: 'Regular Reader', comments: 4 },
      { member_id: 'member2', name: null, comments: 2 },
    ],
  });
  return { overviewApi, topPostsApi, topCommentersApi };
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
    await page.getByRole('option', { name: 'Last 7 days' }).click();

    await expect.poll(() => requestedDays(overviewApi.requests.at(-1)!.url)).toBe(7);
    await expect.poll(currentRoute).toContain('range=7');

    await commentsScreen.analyticsKpiTab('Reported').click();

    await expect.poll(currentRoute).toContain('tab=reported');
    await expect
      .element(commentsScreen.analyticsKpiTab('Reported'))
      .toHaveAttribute('aria-selected', 'true');
  });

  it('lists the top 25 in a sheet from View all', async () => {
    fakeComments([comment()]);
    fakeCommentsStats();
    await renderAdminApp('/comments', { labs });

    const topPosts = commentsScreen.analyticsTopPosts();
    await expect.element(topPosts).toHaveTextContent('Popular post 5');
    await expect.element(topPosts.getByText('Popular post 6')).not.toBeInTheDocument();

    await commentsScreen.analyticsViewAll(topPosts).click();

    await expect.element(page.getByRole('dialog').getByText('Popular post 7')).toBeVisible();
  });

  it('opens the panel from the header on narrower screens', async () => {
    await page.viewport(1000, 800);
    fakeComments([comment()]);
    fakeCommentsStats();
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();

    await commentsScreen.analyticsButton().click();

    await expect.element(page.getByRole('dialog').getByTestId('comments-analytics')).toBeVisible();
    await expect.element(commentsScreen.analyticsKpiValue('comments')).toHaveTextContent('12');
  });

  it('hides itself when Core has no comments stats endpoint', async () => {
    fakeComments([comment({ html: '<p>Still listed</p>' })]);
    const notFound = { errors: [{ message: 'Resource not found', type: 'NotFoundError' }] };
    fakeAdminEndpoint('GET', /^\/stats\/comments\//, notFound, { status: 404 });
    await renderAdminApp('/comments', { labs });

    await expect.element(commentsScreen.commentRow('Still listed')).toBeVisible();
    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
    await expect.element(commentsScreen.analyticsButton()).not.toBeInTheDocument();
    await expect.element(page.getByText(/went wrong/i)).not.toBeInTheDocument();
  });

  it('stays off without the labs flag', async () => {
    // No stats fakes: a request would be served a 418 and fail the test
    fakeComments([comment({ html: '<p>Plain list</p>' })]);
    await renderAdminApp('/comments');

    await expect.element(commentsScreen.commentRow('Plain list')).toBeVisible();
    await expect.element(commentsScreen.analyticsPanel()).not.toBeInTheDocument();
  });
});
