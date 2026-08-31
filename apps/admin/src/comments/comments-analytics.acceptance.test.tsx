import { describe, expect, it } from 'vitest';

import {
  comment,
  fakeAdminStats,
  fakeComments,
  fakePages,
  fakePosts,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';
import { commentsScreen } from './comments.screen';

describe('Comments analytics rail', () => {
  it('renders the overview next to the list', async () => {
    fakeComments([comment({ html: '<p>A published comment</p>' })]);
    fakeAdminStats.commentsOverview({
      totals: { comments: 12, commenters: 4, reported: 1 },
      previous_totals: { comments: 10, commenters: 3, reported: 0 },
      series: [{ date: '2026-02-08', count: 3, commenters: 2, reported: 1 }],
      series_aggregation: 'day',
      top_posts: [{ id: 'post-1', title: 'Popular post', slug: 'popular', count: 8 }],
      top_members: [{ id: 'mem-1', name: 'Alice', count: 5 }],
    });
    await renderAdminApp('/comments');

    await expect.element(commentsScreen.analytics()).toBeVisible();
    await expect.element(commentsScreen.commentRow('A published comment')).toBeVisible();
    await expect.element(commentsScreen.analytics().getByText('Popular post')).toBeVisible();
    await expect.element(commentsScreen.analytics().getByText('Alice')).toBeVisible();
  });

  it('filters the list to a top post', async () => {
    const onPost = comment({ html: '<p>On the popular post</p>' });
    const offPost = comment({ html: '<p>On another post</p>' });
    const commentsApi = fakeComments(({ filter }) => (filter ? [onPost] : [offPost]));
    // The applied post filter renders a chip, which resolves the post's title.
    fakePosts([post({ id: 'post-1', title: 'Popular post' })]);
    fakePages([]);
    fakeAdminStats.commentsOverview({
      totals: { comments: 1, commenters: 1, reported: 0 },
      previous_totals: { comments: 0, commenters: 0, reported: 0 },
      series: [],
      series_aggregation: 'day',
      top_posts: [{ id: 'post-1', title: 'Popular post', slug: 'popular', count: 8 }],
      top_members: [],
    });
    await renderAdminApp('/comments');

    await expect.element(commentsScreen.commentRow('On another post')).toBeVisible();
    await commentsScreen
      .analytics()
      .getByRole('button', { name: /Popular post/ })
      .click();

    await expect.poll(() => commentsApi.lastRequest?.filter).toMatch(/post_id:/);
    await expect.poll(() => commentsApi.lastRequest?.filter).toMatch(/created_at:.*created_at:/);
    await expect.element(commentsScreen.commentRow('On the popular post')).toBeVisible();
    await expect.element(commentsScreen.commentRow('On another post')).not.toBeInTheDocument();
  });

  it('hides the rail when Core does not have the endpoint', async () => {
    fakeComments([comment({ html: '<p>Still listed</p>' })]);
    fakeAdminStats.commentsOverview(
      {
        totals: { comments: 0, commenters: 0, reported: 0 },
        previous_totals: null,
        series: [],
        series_aggregation: 'day',
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
