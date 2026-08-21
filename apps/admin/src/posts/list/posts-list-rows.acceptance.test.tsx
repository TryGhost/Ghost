import { beforeEach, describe, expect, it } from 'vitest';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
  staffRole,
  tag,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';

const FLAG_ON = { labs: { postsListReact: true } };

/**
 * What a row says, and the two empty states — the parity-critical surface of
 * the list. The strings themselves are unit-tested in post-row-copy.test.ts;
 * these check they reach the screen and that the states switch correctly.
 */
describe('Posts list rows', () => {
  // The filter bar mounts with the screen and probes these to resolve any
  // author/tag slug in the URL into a name.
  beforeEach(() => {
    fakePostsListScreen();
  });

  it('shows the title, byline, primary tag and status', async () => {
    fakePosts([
      post({
        title: 'A published post',
        status: 'published',
        authors: [{ id: 'a1', name: 'Ada Lovelace' }],
        primary_tag: tag({ name: 'Engineering' }),
      }),
    ]);
    await renderAdminApp('/posts', FLAG_ON);

    const row = postsListScreen.listItems().first();
    await expect.element(row).toBeVisible();
    await expect.element(row).toHaveTextContent('A published post');
    await expect.element(row).toHaveTextContent('By Ada Lovelace');
    await expect.element(row).toHaveTextContent('Engineering');
    await expect.element(row).toHaveTextContent('Published');
  });

  // Scoped to one bucket: the fake doesn't implement NQL, so an unfiltered
  // render would serve these same posts to all three status queries.
  it('marks a featured post', async () => {
    fakePosts([
      post({ title: 'Featured one', status: 'published', featured: true }),
      post({ title: 'Ordinary one', status: 'published', featured: false }),
    ]);
    await renderAdminApp('/posts?type=published', FLAG_ON);

    await expect(postsListScreen.listItems()).toHaveCount(2);
    await expect(postsListScreen.featuredMarkers()).toHaveCount(1);
  });

  // The wording that would not survive a visual check.
  it("says a published post's newsletter failed", async () => {
    fakePosts([
      post({
        title: 'Failed send',
        status: 'published',
        email: { status: 'failed', email_count: 10, opened_count: 0 },
      }),
    ]);
    await renderAdminApp('/posts', FLAG_ON);

    await expect
      .element(postsListScreen.listItems().first())
      .toHaveTextContent('Published but failed to send newsletter');
  });

  it("does not say 'Sent' for an email-only post that failed", async () => {
    fakePosts([
      post({
        title: 'Failed email',
        status: 'sent',
        email: { status: 'failed', email_count: 10, opened_count: 0 },
      }),
    ]);
    await renderAdminApp('/posts?type=sent', FLAG_ON);

    const row = postsListScreen.listItems().first();
    await expect.element(row).toHaveTextContent('Failed to send newsletter');
    // A substring check alone would pass against "Sent - Failed to ...".
    await expect.element(row).not.toHaveTextContent(/(^|[^-])\bSent\b/);
  });

  it('links a row to the editor', async () => {
    const target = post({ title: 'Editable', status: 'draft' });
    fakePosts([target]);
    await renderAdminApp('/posts', FLAG_ON);

    await expect
      .element(postsListScreen.rowLink().first())
      .toHaveAttribute('href', `#/editor/post/${target.id}`);
  });

  describe('as a Contributor', () => {
    const asContributor = () => {
      const me = currentUserResponse();
      me.users[0].roles = [staffRole({ name: 'Contributor' })];
      me.users[0].slug = 'contrib';
      return { ...FLAG_ON, boot: { browseMe: { response: me } } };
    };

    it('links a published post out to the site instead of the editor', async () => {
      const target = post({
        title: 'Live post',
        status: 'published',
        url: 'https://example.com/live-post/',
      });
      fakePosts([target]);
      await renderAdminApp('/posts?type=published', asContributor());

      const link = postsListScreen.rowLink().first();
      await expect.element(link).toHaveAttribute('href', 'https://example.com/live-post/');
      await expect.element(link).toHaveAttribute('target', '_blank');
    });

    // Ember's isPublished is strictly status === 'published', so an
    // email-only post still opens in the editor.
    it('still links an email-only post to the editor', async () => {
      const target = post({ title: 'Email only', status: 'sent' });
      fakePosts([target]);
      await renderAdminApp('/posts?type=sent', asContributor());

      await expect
        .element(postsListScreen.rowLink().first())
        .toHaveAttribute('href', `#/editor/post/${target.id}`);
    });

    it('links a draft to the editor', async () => {
      const target = post({ title: 'My draft', status: 'draft' });
      fakePosts([target]);
      await renderAdminApp('/posts?type=draft', asContributor());

      await expect
        .element(postsListScreen.rowLink().first())
        .toHaveAttribute('href', `#/editor/post/${target.id}`);
    });
  });

  it('links a page row to the page editor', async () => {
    const target = post({ title: 'A page', status: 'draft' });
    fakePages([target]);
    await renderAdminApp('/pages', FLAG_ON);

    await expect
      .element(postsListScreen.rowLink().first())
      .toHaveAttribute('href', `#/editor/page/${target.id}`);
  });
});

describe('Posts list empty states', () => {
  // The filter bar mounts with the screen and probes these to resolve any
  // author/tag slug in the URL into a name.
  beforeEach(() => {
    fakePostsListScreen();
  });

  it('invites you to write when there is nothing at all', async () => {
    fakePosts([]);
    await renderAdminApp('/posts', FLAG_ON);

    await expect.element(postsListScreen.emptyCold()).toBeVisible();
    await expect.element(postsListScreen.emptyCold()).toHaveTextContent('Start creating content');
  });

  it('uses the page wording on the pages screen', async () => {
    fakePages([]);
    await renderAdminApp('/pages', FLAG_ON);

    await expect
      .element(postsListScreen.emptyCold())
      .toHaveTextContent('Tell the world about yourself');
  });

  it('offers a way back when a filter matched nothing', async () => {
    fakePosts([]);
    await renderAdminApp('/posts?type=draft', FLAG_ON);

    await expect.element(postsListScreen.emptyFiltered()).toBeVisible();
    await expect
      .element(postsListScreen.emptyFiltered())
      .toHaveTextContent('No posts match the current filter');
  });

  // Ember's "Show all posts" resets the filters but deliberately not the
  // sort, so a chosen order survives.
  it('clears the filters but keeps the sort when taking that way back', async () => {
    fakePosts([]);
    await renderAdminApp('/posts?type=draft&tag=news&order=published_at+asc', FLAG_ON);

    await postsListScreen.showAllButton('posts').click();

    await expect.poll(currentRoute).toBe('/posts?order=published_at+asc');
  });

  // Sorting is not filtering: Ember excludes `order` from this check, so
  // re-sorting an empty list still offers "write your first post".
  it('treats a sort-only URL as unfiltered', async () => {
    fakePosts([]);
    await renderAdminApp('/posts?order=published_at+asc', FLAG_ON);

    await expect.element(postsListScreen.emptyCold()).toBeVisible();
  });

  /**
   * The trailing button. Which of the three it is depends on the post *and*
   * the signed-in role, and getting it wrong sends people somewhere they
   * can't act — a contributor into an editor they have no rights to, or an
   * author to an analytics screen they can't open.
   */
});

describe('Posts list trailing action button', () => {
  beforeEach(() => {
    fakePostsListScreen();
  });

  const settingsWithTracking = {
    settings: [
      { key: 'email_track_opens', value: true },
      { key: 'members_signup_access', value: 'all' },
    ],
  };

  const emailedPost = post({
    title: 'A sent post',
    status: 'published',
    email: { opened_count: 5, email_count: 10, track_opens: true, track_clicks: false },
  });

  function asRole(name: 'Administrator' | 'Author' | 'Contributor', slug: string) {
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name })];
    me.users[0].slug = slug;
    return { ...FLAG_ON, boot: { browseMe: { response: me } } };
  }

  it('goes to analytics for an admin on a post with newsletter engagement', async () => {
    fakeAdminEndpoint('GET', /^\/settings\//, settingsWithTracking);
    fakePosts([emailedPost]);
    await renderAdminApp('/posts?type=published', asRole('Administrator', 'admin-user'));

    const action = postsListScreen.rowAction().first();
    await expect.element(action).toHaveAccessibleName('Go to Analytics');
    await expect.element(action).toHaveAttribute('href', `#/posts/analytics/${emailedPost.id}`);
  });

  // Same post, lesser role: Ember gates the analytics screen on isAdmin.
  it('falls back to the editor for an author', async () => {
    fakeAdminEndpoint('GET', /^\/settings\//, settingsWithTracking);
    fakePosts([emailedPost]);
    await renderAdminApp('/posts?type=published', asRole('Author', 'an-author'));

    const action = postsListScreen.rowAction().first();
    await expect.element(action).toHaveAccessibleName('Go to Editor');
    await expect.element(action).toHaveAttribute('href', `#/editor/post/${emailedPost.id}`);
  });

  it('links a contributor out to the live post', async () => {
    const published = post({
      title: 'Live one',
      status: 'published',
      url: 'https://example.com/live/',
    });
    fakePosts([published]);
    await renderAdminApp('/posts?type=published', asRole('Contributor', 'a-contributor'));

    const action = postsListScreen.rowAction().first();
    await expect.element(action).toHaveAccessibleName('View post');
    await expect.element(action).toHaveAttribute('href', 'https://example.com/live/');
    await expect.element(action).toHaveAttribute('target', '_blank');
  });

  it('goes to the editor on a page, which has no analytics screen', async () => {
    const page = post({ title: 'About', status: 'published' });
    fakePages([page]);
    await renderAdminApp('/pages?type=published', asRole('Administrator', 'admin-user'));

    const action = postsListScreen.rowAction().first();
    await expect.element(action).toHaveAccessibleName('Go to Editor');
    await expect.element(action).toHaveAttribute('href', `#/editor/page/${page.id}`);
  });
});

/**
 * The hover panel is the whole visible half of the metrics feature, and until
 * now nothing rendered it: the contents were asserted against the pure
 * `getPostMetricTooltip`, so the trigger could have stopped cloning onto the
 * anchor, or the portal could have broken, with every test still green.
 */
describe('Posts list metric hover panels', () => {
  beforeEach(() => {
    fakePostsListScreen();
  });

  it('opens the newsletter breakdown on hovering a metric', async () => {
    fakeAdminEndpoint('GET', /^\/settings\//, {
      settings: [
        { key: 'email_track_opens', value: true },
        { key: 'members_signup_access', value: 'all' },
      ],
    });
    fakePosts([
      post({
        title: 'A sent post',
        status: 'published',
        email: { opened_count: 60, email_count: 200, track_opens: true, track_clicks: false },
      }),
    ]);
    await renderAdminApp('/posts?type=published', FLAG_ON);

    // The column shows the rate; the panel underneath shows raw counts.
    await expect.element(postsListScreen.metricCell('Opens')).toHaveTextContent('30%');
    await postsListScreen.metricCell('Opens').hover();

    const panel = postsListScreen.metricPanel();
    await expect.element(panel).toBeVisible();
    await expect.element(panel).toHaveTextContent('Newsletter performance');
    await expect.element(panel).toHaveTextContent('Sent');
    await expect.element(panel).toHaveTextContent('200');
    await expect.element(panel).toHaveTextContent('60');
  });
});
