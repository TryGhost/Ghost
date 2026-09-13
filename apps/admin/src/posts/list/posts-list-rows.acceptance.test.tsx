import { beforeEach, describe, expect, it } from 'vitest';
import { focusManager } from '@tanstack/react-query';

import {
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  tag,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';

const FLAG_ON = { labs: { postsListReact: true } };
const SENDING_FLAG_ON = { labs: { postsListReact: true, improveSendingUI: true } };
const EMAIL_ID = '64d623b64676110001e897ab';

const emailMetricsSettings = settingsResponse({
  settings: {
    email_track_opens: true,
    email_track_clicks: true,
    web_analytics_enabled: true,
    members_signup_access: 'all',
  },
});

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

  it('renders page metrics without linking to post analytics', async () => {
    fakePages([post({ title: 'A tracked page', status: 'published' })]);
    await renderAdminApp('/pages?type=published', {
      ...FLAG_ON,
      boot: {
        browseSettings: {
          response: settingsResponse({ settings: { web_analytics_enabled: true } }),
        },
      },
    });

    const visitors = postsListScreen.metricCell('Visitors');
    await expect.element(visitors).toBeVisible();
    await expect.element(visitors).not.toHaveAttribute('href');
  });
});

describe('Posts list email sending status', () => {
  beforeEach(() => {
    fakePostsListScreen();
  });

  it('shows preparing progress and hides only email metrics', async () => {
    fakePosts([
      post({
        id: 'preparing-post',
        title: 'Preparing post',
        status: 'published',
        email: {
          id: EMAIL_ID,
          status: 'pending',
          email_count: 1000,
          opened_count: 0,
          track_opens: true,
          track_clicks: true,
        },
        count: { clicks: 0, positive_feedback: 0, negative_feedback: 0 },
      }),
    ]);
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, {
      email_statuses: [
        {
          id: EMAIL_ID,
          sending: {
            status: 'preparing',
            progress: { completed: 250, total: 1000, estimated_seconds_remaining: 30 },
          },
        },
      ],
    });

    await renderAdminApp('/posts?type=published', {
      ...SENDING_FLAG_ON,
      boot: { browseSettings: { response: emailMetricsSettings } },
    });

    const row = postsListScreen.listItems().first();
    await expect.element(row).toHaveTextContent('Preparing emails · 250 of 1,000');
    await expect.element(row).not.toHaveTextContent('minute');
    await expect.element(row).not.toHaveTextContent('Published and sent');
    await expect.element(row.getByLabelText(/Visitors/)).toBeVisible();
    await expect.element(row.getByLabelText(/Sent/)).not.toBeInTheDocument();
    await expect.element(row.getByLabelText(/Opens/)).not.toBeInTheDocument();
    await expect.element(row.getByLabelText(/Clicks/)).not.toBeInTheDocument();
    await expect.element(row.getByRole('status')).not.toBeInTheDocument();
  });

  it('shows coarse sending copy through a transient error and recovers on focus', async () => {
    fakePosts([
      post({
        id: 'sending-post',
        title: 'Sending post',
        status: 'published',
        email: { id: EMAIL_ID, status: 'submitting', email_count: 1000, opened_count: 0 },
      }),
    ]);
    const failedStatusApi = fakeAdminEndpoint(
      'GET',
      `/emails/${EMAIL_ID}/status/`,
      { errors: [{ message: 'Bad gateway' }] },
      { status: 502 },
    );

    await renderAdminApp('/posts?type=published', SENDING_FLAG_ON);

    const row = postsListScreen.listItems().first();
    await expect.element(row).toHaveTextContent('Sending emails');
    await expect.element(row).not.toHaveTextContent('Published and sent');
    await expect.poll(() => failedStatusApi.requests.length).toBe(1);

    const recoveredStatusApi = fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, {
      email_statuses: [
        {
          id: EMAIL_ID,
          sending: {
            status: 'submitting',
            progress: { completed: 500, total: 1000, estimated_seconds_remaining: null },
          },
        },
      ],
    });
    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await expect.poll(() => recoveredStatusApi.requests.length).toBeGreaterThan(0);
    await expect.element(row).toHaveTextContent('Sending emails · 500 of 1,000');
    focusManager.setFocused(undefined);
  });

  it('refreshes the post and restores settled copy and metrics after sending', async () => {
    const sendingPost = post({
      id: 'completed-post',
      title: 'Completed post',
      status: 'published',
      email: {
        id: EMAIL_ID,
        status: 'submitting',
        email_count: 0,
        opened_count: 0,
        track_opens: true,
        track_clicks: true,
      },
      count: { clicks: 0, positive_feedback: 0, negative_feedback: 0 },
    });
    const submittedPost = post({
      ...sendingPost,
      email: {
        ...sendingPost.email!,
        status: 'submitted',
        email_count: 1000,
        opened_count: 400,
      },
      count: { clicks: 60, positive_feedback: 0, negative_feedback: 0 },
    });
    let sendingComplete = false;
    const postsApi = fakePosts(() => [sendingComplete ? submittedPost : sendingPost]);
    let statusRequestCount = 0;
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, () => {
      statusRequestCount += 1;
      return {
        email_statuses: [
          {
            id: EMAIL_ID,
            sending: sendingComplete
              ? {
                  status: 'submitted',
                  progress: { completed: 1000, total: 1000, estimated_seconds_remaining: 0 },
                }
              : {
                  status: 'submitting',
                  progress: { completed: 500, total: 1000, estimated_seconds_remaining: null },
                },
          },
        ],
      };
    });

    await renderAdminApp('/posts?type=published', {
      ...SENDING_FLAG_ON,
      boot: { browseSettings: { response: emailMetricsSettings } },
    });

    const row = postsListScreen.listItems().first();
    await expect.element(row).toHaveTextContent('Sending emails · 500 of 1,000');
    await expect.element(row.getByLabelText(/Sent/)).not.toBeInTheDocument();

    sendingComplete = true;
    const pendingStatusRequestCount = statusRequestCount;
    await expect
      .poll(() => statusRequestCount, { timeout: 3500 })
      .toBeGreaterThan(pendingStatusRequestCount);
    await expect.poll(() => postsApi.requests.length).toBeGreaterThan(1);
    await expect.element(row).toHaveTextContent('Published and sent');
    await expect.element(row).not.toHaveTextContent('Sending emails');
    await expect.element(row.getByLabelText(/Opens/)).toHaveTextContent('40%');
    await expect.element(row.getByLabelText(/Clicks/)).toHaveTextContent('6%');
  });

  it('uses the existing failure state when polling reports a failure', async () => {
    const sendingPost = post({
      id: 'failed-post',
      title: 'Failed post',
      status: 'published',
      email: { id: EMAIL_ID, status: 'submitting', email_count: 0, opened_count: 0 },
    });
    let sendingFailed = false;
    const postsApi = fakePosts(() => [
      sendingFailed
        ? post({
            ...sendingPost,
            email: { ...sendingPost.email!, status: 'failed', error: 'The send failed.' },
          })
        : sendingPost,
    ]);
    let statusRequestCount = 0;
    fakeAdminEndpoint('GET', `/emails/${EMAIL_ID}/status/`, () => {
      statusRequestCount += 1;
      return {
        email_statuses: [
          {
            id: EMAIL_ID,
            sending: sendingFailed
              ? {
                  status: 'failed',
                  failed_during: 'submitting',
                  progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
                }
              : {
                  status: 'submitting',
                  progress: { completed: 250, total: 1000, estimated_seconds_remaining: null },
                },
          },
        ],
      };
    });

    await renderAdminApp('/posts?type=published', SENDING_FLAG_ON);
    const row = postsListScreen.listItems().first();
    await expect.element(row).toHaveTextContent('Sending emails');

    sendingFailed = true;
    const pendingStatusRequestCount = statusRequestCount;
    await expect
      .poll(() => statusRequestCount, { timeout: 3500 })
      .toBeGreaterThan(pendingStatusRequestCount);
    await expect.element(row).toHaveTextContent('Published but failed to send newsletter');
    await expect.element(row).not.toHaveTextContent('Emails failed to send');
    await expect.poll(() => postsApi.requests.length).toBeGreaterThan(1);
  });

  it('falls back to the existing row when the status endpoint is unavailable', async () => {
    fakePosts([
      post({
        id: 'unsupported-post',
        title: 'Unsupported post',
        status: 'published',
        email: { id: EMAIL_ID, status: 'submitting', email_count: 1000, opened_count: 0 },
      }),
    ]);
    const statusApi = fakeAdminEndpoint(
      'GET',
      `/emails/${EMAIL_ID}/status/`,
      { errors: [{ message: 'Resource not found' }] },
      { status: 404 },
    );

    const app = await renderAdminApp('/posts?type=published', SENDING_FLAG_ON);

    const row = postsListScreen.listItems().first();
    await expect.element(row).toHaveTextContent('Published and sent');
    await expect.element(row).not.toHaveTextContent('Sending emails');
    await expect.poll(() => statusApi.requests.length).toBe(1);
    await app.unmount();
  });

  it('polls every concurrently active email independently', async () => {
    const firstEmailId = '64d623b64676110001e897a1';
    const secondEmailId = '64d623b64676110001e897a2';
    fakePosts([
      post({
        id: 'first-active-post',
        title: 'First active post',
        status: 'published',
        email: { id: firstEmailId, status: 'submitting', email_count: 1000, opened_count: 0 },
      }),
      post({
        id: 'second-active-post',
        title: 'Second active post',
        status: 'sent',
        email_only: true,
        email: { id: secondEmailId, status: 'pending', email_count: 2000, opened_count: 0 },
      }),
    ]);
    const firstStatusApi = fakeAdminEndpoint('GET', `/emails/${firstEmailId}/status/`, {
      email_statuses: [
        {
          id: firstEmailId,
          sending: {
            status: 'submitting',
            progress: { completed: 100, total: 1000, estimated_seconds_remaining: null },
          },
        },
      ],
    });
    const secondStatusApi = fakeAdminEndpoint('GET', `/emails/${secondEmailId}/status/`, {
      email_statuses: [
        {
          id: secondEmailId,
          sending: {
            status: 'preparing',
            progress: { completed: 200, total: 2000, estimated_seconds_remaining: null },
          },
        },
      ],
    });

    await renderAdminApp('/posts?type=published', SENDING_FLAG_ON);

    await expect.element(postsListScreen.listItems().nth(0)).toHaveTextContent('100 of 1,000');
    await expect.element(postsListScreen.listItems().nth(1)).toHaveTextContent('200 of 2,000');
    await expect.poll(() => firstStatusApi.requests.length).toBeGreaterThan(0);
    await expect.poll(() => secondStatusApi.requests.length).toBeGreaterThan(0);
  });

  it('does not request status when the sending UI flag is off', async () => {
    fakePosts([
      post({
        title: 'Flagged off post',
        status: 'published',
        email: { id: EMAIL_ID, status: 'submitting', email_count: 1000, opened_count: 0 },
      }),
    ]);

    await renderAdminApp('/posts?type=published', FLAG_ON);

    const row = postsListScreen.listItems().first();
    await expect.element(row).toHaveTextContent('Published and sent');
    await expect.element(row).not.toHaveTextContent('Sending emails');
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
