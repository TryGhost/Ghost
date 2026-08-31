import { describe, expect, it } from 'vitest';

import { comment, fakeAdminStats, fakeComments, renderAdminApp } from '@test-utils/acceptance';
import { commentsScreen } from './comments.screen';

describe('Comments analytics rail', () => {
  it('renders the overview next to the list', async () => {
    fakeComments([comment({ html: '<p>A published comment</p>' })]);
    fakeAdminStats.commentsOverview({
      totals: { comments: 12, commenters: 4, reported: 1 },
      previous_totals: { comments: 10, commenters: 3, reported: 0 },
      series: [{ date: '2026-02-08', count: 3, commenters: 2, reported: 1 }],
      top_posts: [{ id: 'post-1', title: 'Popular post', slug: 'popular', count: 8 }],
      top_members: [{ id: 'mem-1', name: 'Alice', email: 'a@example.com', count: 5 }],
    });
    await renderAdminApp('/comments');

    await expect.element(commentsScreen.analytics()).toBeVisible();
    await expect.element(commentsScreen.commentRow('A published comment')).toBeVisible();
    await expect.element(commentsScreen.analytics().getByText('Popular post')).toBeVisible();
    await expect.element(commentsScreen.analytics().getByText('Alice')).toBeVisible();
  });

  it('filters the list to a top post', async () => {
    const onPost = comment({ html: '<p>On the popular post</p>' });
    const commentsApi = fakeComments(({ filter }) => (filter ? [onPost] : [onPost]));
    fakeAdminStats.commentsOverview({
      totals: { comments: 1, commenters: 1, reported: 0 },
      previous_totals: { comments: 0, commenters: 0, reported: 0 },
      series: [],
      top_posts: [{ id: 'post-1', title: 'Popular post', slug: 'popular', count: 8 }],
      top_members: [],
    });
    await renderAdminApp('/comments');

    await commentsScreen
      .analytics()
      .getByRole('button', { name: /Popular post/ })
      .click();

    await expect.poll(() => commentsApi.lastRequest?.filter).toMatch(/post_id:/);
  });

  it('hides the rail when Core does not have the endpoint', async () => {
    fakeComments([comment({ html: '<p>Still listed</p>' })]);
    fakeAdminStats.commentsOverview(
      {
        totals: { comments: 0, commenters: 0, reported: 0 },
        previous_totals: null,
        series: [],
        top_posts: [],
        top_members: [],
      },
      { status: 404 },
    );
    await renderAdminApp('/comments');

    await expect.element(commentsScreen.commentRow('Still listed')).toBeVisible();
    await expect.element(commentsScreen.analytics()).not.toBeInTheDocument();
  });
});
