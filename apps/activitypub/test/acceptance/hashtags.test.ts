import activityPubUser from '../utils/responses/activitypub/users.json' with { type: 'json' };
import feedFixture from '../utils/responses/activitypub/feed.json' with { type: 'json' };
import { expect, test } from '@playwright/test';
import { mockApi } from '@tryghost/admin-x-framework/test/acceptance';
import { mockInitialApiRequests } from '../utils/initial-api-requests';

const myAccount = {
  id: 'index',
  handle: '@index@example.com',
  name: 'Test User',
  url: 'https://example.com/@index',
  avatarUrl: null,
  bannerImageUrl: null,
  followingCount: 0,
  followerCount: 0,
  likedCount: 0,
};

// A single page of posts, so no follow-up page is requested
const singlePageFeed = { ...feedFixture, next: null };

const feedWithHashtag = {
  ...singlePageFeed,
  posts: feedFixture.posts.map((post, index) =>
    index === 0
      ? {
          ...post,
          content:
            '<p>Loving <a href="https://test.instance/tags/ghost" class="mention hashtag" rel="tag">#<span>ghost</span></a> today</p>',
        }
      : post,
  ),
};

// Requests made by the app shell, the sidebar and the search modal
const appShellRequests = {
  getActivityPubUser: {
    method: 'GET',
    path: '/users/index',
    response: activityPubUser,
  },
  getNotificationsCount: {
    method: 'GET',
    path: '/v1/notifications/unread/count',
    response: { count: 0 },
  },
  getPreferences: {
    method: 'GET',
    path: '/v1/preferences',
    response: { showSensitiveMedia: false },
  },
  getMyAccount: {
    method: 'GET',
    path: '/v1/account/me',
    response: myAccount,
  },
  getTopics: {
    method: 'GET',
    path: '/v1/topics',
    response: { topics: [] },
  },
  getRecommendations: {
    method: 'GET',
    path: /\/v1\/recommendations/,
    response: { accounts: [] },
  },
  // The ActivityPub service supports hashtags if it rejects an invalid one
  getHashtagSupport: {
    method: 'GET',
    path: '/v1/feed/hashtag/_',
    response: {},
    responseStatus: 400,
  },
};

test.describe('Hashtags', async () => {
  test.beforeEach(async ({ page }) => {
    await mockInitialApiRequests(page);
  });

  test('I can open a hashtag from a post', async ({ page }) => {
    const { lastApiRequests } = await mockApi({
      page,
      requests: {
        ...appShellRequests,
        getFeed: {
          method: 'GET',
          path: '/v1/feed/notes',
          response: feedWithHashtag,
        },
        getHashtagFeed: {
          method: 'GET',
          path: '/v1/feed/hashtag/ghost',
          response: singlePageFeed,
        },
      },
      options: { useActivityPub: true },
    });

    // Hashtag links are only opened in-app once hashtag support is confirmed
    const hashtagSupport = page.waitForResponse(/\/v1\/feed\/hashtag\/_$/);
    await page.goto('#/notes');

    const feedItems = page.getByTestId('feed-item');
    await expect(feedItems).toHaveCount(10);
    await hashtagSupport;

    const hashtagLink = feedItems.first().getByRole('link', { name: '#ghost' });
    await hashtagLink.click();

    await expect(page).toHaveURL(/#\/hashtags\/ghost$/);
    await expect(page.getByRole('heading', { name: '#ghost' })).toBeVisible();
    await expect(page.getByTestId('profile-posts-list')).toBeVisible();
    await expect(page.getByTestId('profile-post-item')).toHaveCount(feedFixture.posts.length);
    expect(lastApiRequests.getHashtagFeed).toBeTruthy();
  });

  test('I can open a hashtag from search by typing it', async ({ page }) => {
    await mockApi({
      page,
      requests: {
        ...appShellRequests,
        getFeed: {
          method: 'GET',
          path: '/v1/feed/notes',
          response: singlePageFeed,
        },
        search: {
          method: 'GET',
          path: /\/v1\/actions\/search\?query=%23ghost$/,
          response: { accounts: [], hashtags: [] },
        },
        getHashtagFeed: {
          method: 'GET',
          path: '/v1/feed/hashtag/ghost',
          response: singlePageFeed,
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/notes');

    // Wait for the feed to settle so the layout isn't re-rendered while the dialog opens
    await expect(page.getByTestId('feed-item')).toHaveCount(10);

    await page.getByText('Search the social web').click();

    const searchInput = page.getByPlaceholder('Search by name, handle, or URL...');
    await searchInput.fill('#ghost');

    // The typed hashtag is offered even though the server returned no hashtags
    await expect(page.getByRole('dialog').getByText('#ghost')).toBeVisible();

    await searchInput.press('Enter');

    await expect(page).toHaveURL(/#\/hashtags\/ghost$/);
    await expect(page.getByRole('heading', { name: '#ghost' })).toBeVisible();
    await expect(page.getByTestId('profile-post-item')).toHaveCount(feedFixture.posts.length);
  });

  test('I can open a hashtag from the search results', async ({ page }) => {
    await mockApi({
      page,
      requests: {
        ...appShellRequests,
        getFeed: {
          method: 'GET',
          path: '/v1/feed/notes',
          response: singlePageFeed,
        },
        search: {
          method: 'GET',
          path: /\/v1\/actions\/search\?query=gho$/,
          response: { accounts: [], hashtags: [{ name: 'ghost' }, { name: 'ghosts' }] },
        },
        getHashtagFeed: {
          method: 'GET',
          path: '/v1/feed/hashtag/ghosts',
          response: singlePageFeed,
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/notes');

    // Wait for the feed to settle so the layout isn't re-rendered while the dialog opens
    await expect(page.getByTestId('feed-item')).toHaveCount(10);

    await page.getByText('Search the social web').click();
    await page.getByPlaceholder('Search by name, handle, or URL...').fill('gho');

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('#ghost', { exact: true })).toBeVisible();
    await dialog.getByText('#ghosts', { exact: true }).click();

    await expect(page).toHaveURL(/#\/hashtags\/ghosts$/);
    await expect(page.getByRole('heading', { name: '#ghosts' })).toBeVisible();
  });

  test('I see an empty state for a hashtag without posts', async ({ page }) => {
    await mockApi({
      page,
      requests: {
        ...appShellRequests,
        getHashtagFeed: {
          method: 'GET',
          path: '/v1/feed/hashtag/quiet',
          response: { posts: [], next: null },
        },
      },
      options: { useActivityPub: true },
    });

    await page.goto('#/hashtags/quiet');

    await expect(page.getByRole('heading', { name: '#quiet' })).toBeVisible();
    await expect(page.getByText('No posts found for #quiet yet')).toBeVisible();
  });

  test('Hashtags stay regular links when the ActivityPub service has no hashtag support', async ({
    page,
  }) => {
    const { lastApiRequests } = await mockApi({
      page,
      requests: {
        ...appShellRequests,
        getHashtagSupport: {
          method: 'GET',
          path: '/v1/feed/hashtag/_',
          response: {},
          responseStatus: 404,
        },
        getFeed: {
          method: 'GET',
          path: '/v1/feed/notes',
          response: feedWithHashtag,
        },
        search: {
          method: 'GET',
          path: /\/v1\/actions\/search\?query=%23ghost$/,
          response: { accounts: [] },
        },
      },
      options: { useActivityPub: true },
    });

    await page.route('https://test.instance/**', (route) => route.fulfill({ body: 'Hashtag page' }));
    const hashtagSupport = page.waitForResponse(/\/v1\/feed\/hashtag\/_$/);
    await page.goto('#/notes');

    // Wait for the feed to settle so the layout isn't re-rendered while the dialog opens
    await expect(page.getByTestId('feed-item')).toHaveCount(10);
    await hashtagSupport;

    await page.getByText('Search the social web').click();
    await page.getByPlaceholder('Search by name, handle, or URL...').fill('#ghost');
    await expect.poll(() => lastApiRequests.search).toBeTruthy();

    // No hashtag to open is offered for the typed query
    await expect(page.getByRole('dialog').getByText('#ghost')).toHaveCount(0);
    await page.keyboard.press('Escape');

    // A hashtag in a post opens on its server, like any other link
    await page.getByTestId('feed-item').first().getByRole('link', { name: '#ghost' }).click();

    await expect(page).toHaveURL('https://test.instance/tags/ghost');
  });
});
