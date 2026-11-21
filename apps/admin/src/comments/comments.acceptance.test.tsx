import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import {
  browseResponse,
  comment,
  commentThread,
  currentRoute,
  fakeAdminEndpoint,
  fakeAdminStats,
  fakeComments,
  renderAdminApp,
  reply,
  type Comment,
} from '@test-utils/acceptance';
import { commentsScreen } from './comments.screen';

/** The thread sidebar reads its selected comment from the read endpoint, which has no resource fake. */
function fakeCommentRead(entity: Comment): void {
  fakeAdminEndpoint('GET', new RegExp(`^/comments/${entity.id}/\\?`), { comments: [entity] });
}

describe('Static comment rows', () => {
  it.each([false, true])(
    'keeps row hover and focus static with admin7Design %s',
    async (admin7Design) => {
      fakeComments([comment({ html: '<p>A static comment</p>' })]);
      fakeAdminStats.memberCount();
      fakeAdminStats.mrr();
      await renderAdminApp('/comments', { labs: { admin7Design } });
      const row = commentsScreen.commentRow('A static comment');
      await expect.element(row).toBeVisible();
      const background = getComputedStyle(row.element()).backgroundColor;
      const separator = getComputedStyle(row.element()).borderBottomColor;
      await row.hover();
      expect(getComputedStyle(row.element()).backgroundColor).toBe(background);
      expect(getComputedStyle(row.element(), '::before').opacity).toBe('0');
      expect(getComputedStyle(row.element()).borderBottomColor).toBe(separator);
      const hide = row.getByRole('button', { name: 'Hide', exact: true });
      await page.getByRole('heading', { name: 'Comments', exact: true }).hover({ force: true });
      for (let tab = 0; tab < 50 && document.activeElement !== hide.element(); tab += 1) {
        await userEvent.tab();
      }
      await expect.element(hide).toHaveFocus();
      expect(getComputedStyle(row.element()).backgroundColor).toBe(background);
      expect(getComputedStyle(row.element(), '::before').opacity).toBe('0');
    },
  );
});

describe('Comments deep linking', () => {
  it('filters to the linked comment and shows all comments on demand', async () => {
    const target = comment({ html: '<p>This is the target comment</p>' });
    const other = comment({ html: '<p>This is another comment</p>' });
    // The ?id deep link is the only filtered request this spec makes.
    const commentsApi = fakeComments(({ filter }) => (filter ? [target] : [target, other]));
    await renderAdminApp(`/comments?id=is:${target.id}`);

    await expect.element(commentsScreen.commentRow('This is the target comment')).toBeVisible();
    await expect(commentsApi).toHaveSentFilter(`id:'${target.id}'`);
    await expect(commentsScreen.commentRows()).toHaveCount(1);
    await expect.element(commentsScreen.filterButton()).not.toBeInTheDocument();
    await expect.element(commentsScreen.showAllButton()).toBeVisible();

    await commentsScreen.showAllButton().click();

    await expect.element(commentsScreen.commentRow('This is another comment')).toBeVisible();
    await expect(commentsScreen.commentRows()).toHaveCount(2);
    await expect.element(commentsScreen.filterButton()).toBeVisible();
    await expect.element(commentsScreen.showAllButton()).not.toBeInTheDocument();
  });
});

describe('Comments thread sidebar', () => {
  it('navigates within threads and shows the replied-to context', async () => {
    const [root, firstReply, nestedReply] = commentThread('Root comment', [
      reply('First level reply', ['Nested reply to first level']),
    ]);
    fakeCommentRead(root);
    fakeCommentRead(firstReply);
    // Thread queries filter on the thread root's id; the main list sends no filter.
    fakeComments(({ filter }) => {
      if (!filter) {
        return [root];
      }
      return filter.includes(firstReply.id) ? [nestedReply] : [firstReply];
    });
    await renderAdminApp(`/comments?thread=is:${root.id}`);

    await expect.element(commentsScreen.threadRow(root.id)).toBeVisible();
    await expect.element(commentsScreen.threadRow(firstReply.id)).toBeVisible();
    // Direct children carry no replied-to context in their parent's thread.
    await expect
      .element(commentsScreen.threadRow(firstReply.id).repliedToLink())
      .not.toBeInTheDocument();

    const repliesLink = commentsScreen.threadRow(firstReply.id).repliesMetric();
    await expect
      .element(repliesLink)
      .toHaveAttribute('href', `#/comments?thread=is%3A${firstReply.id}`);
    await repliesLink.click();

    await expect.poll(currentRoute).toContain(`thread=is%3A${firstReply.id}`);
    await expect.element(commentsScreen.threadRow(firstReply.id)).toBeVisible();
    await expect.element(commentsScreen.threadRow(nestedReply.id)).toBeVisible();
    // The thread root — itself a reply — shows what it replied to.
    await expect.element(commentsScreen.threadRow(firstReply.id).repliedToLink()).toBeVisible();
  });

  it('opens threads from the main comment list', async () => {
    const [root, rootReply] = commentThread('Comment with replies', ['A reply to the comment']);
    fakeCommentRead(root);
    fakeComments(({ filter }) => (filter ? [rootReply] : [root, rootReply]));
    await renderAdminApp('/comments');

    await commentsScreen.commentRow('Comment with replies').repliesMetric().click();

    await expect.poll(currentRoute).toContain(`thread=is%3A${root.id}`);
    await expect.element(commentsScreen.threadRow(root.id)).toBeVisible();
    await expect.element(commentsScreen.threadRow(rootReply.id)).toBeVisible();

    // Back on the list, the reply's replied-to link is the other thread entry point.
    await commentsScreen.closeThreadSidebar();
    await expect.element(commentsScreen.threadSidebar()).not.toBeInTheDocument();

    await commentsScreen.commentRow('A reply to the comment').repliedToLink().click();

    await expect.poll(currentRoute).toContain(`thread=is%3A${root.id}`);
    await expect.element(commentsScreen.threadSidebar()).toBeVisible();
  });

  it('loads more replies from the load more button', async () => {
    const [root, ...replies] = commentThread('Root comment for pagination test', 5);
    fakeCommentRead(root);
    fakeComments([root]);
    // The thread query (the only filtered browse here) pages at 3 replies per request.
    const threadApi = fakeAdminEndpoint('GET', /^\/comments\/\?.*filter=/, ({ url }) => {
      const requestedPage = Number(new URL(url).searchParams.get('page') ?? '1');
      return browseResponse('comments', replies, { page: requestedPage, limit: 3 });
    });
    await renderAdminApp(`/comments?thread=is:${root.id}`);

    await expect.element(commentsScreen.threadRow(root.id)).toBeVisible();
    await expect(commentsScreen.threadRows()).toHaveCount(4); // root + first page of 3
    await expect.element(commentsScreen.loadMoreRepliesButton()).toBeVisible();

    await commentsScreen.loadMoreRepliesButton().click();

    await expect.poll(() => threadApi.requests.length).toBe(2);
    await expect.element(commentsScreen.threadRow(replies.at(-1)!.id)).toBeVisible();
    await expect(commentsScreen.threadRows()).toHaveCount(6); // root + all 5 replies
    await expect.element(commentsScreen.loadMoreRepliesButton()).not.toBeInTheDocument();
  });
});
