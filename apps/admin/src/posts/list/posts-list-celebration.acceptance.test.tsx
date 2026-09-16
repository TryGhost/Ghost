import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  fakePages,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';

const FLAG_ON = { labs: { postsListReact: true } };

/**
 * The post-publish celebration. The Ember editor writes a localStorage key and
 * navigates to the list, which reads it on mount — the editor stays Ember on
 * both sides of the flag, so only the reader moved.
 */
describe('Posts list publish celebration', () => {
  beforeEach(() => {
    fakePostsListScreen();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('celebrates a post the editor just published', async () => {
    const published = post({ title: 'Just published', status: 'published' });
    fakePosts([published]);
    localStorage.setItem(
      'ghost-last-published-post',
      JSON.stringify({ id: published.id, type: 'post' }),
    );

    await renderAdminApp('/posts?type=published', FLAG_ON);

    await expect.element(postsListScreen.celebrationModal()).toBeVisible();
    await expect.element(postsListScreen.celebrationModal()).toHaveTextContent('Just published');
  });

  /**
   * Ember browses whichever resource the editor named — `store.query(post.type, …)`
   * where type is 'post' or 'page'. Reading a page back off the posts
   * endpoint 404s, so publishing a page would never celebrate at all.
   */
  it('celebrates a page the editor just published', async () => {
    const page = post({ title: 'A published page', status: 'published' });
    fakePages([page]);
    fakePosts([]);
    localStorage.setItem(
      'ghost-last-published-post',
      JSON.stringify({ id: page.id, type: 'page' }),
    );

    await renderAdminApp('/pages?type=published', FLAG_ON);

    await expect.element(postsListScreen.celebrationModal()).toBeVisible();
    await expect.element(postsListScreen.celebrationModal()).toHaveTextContent('A published page');
  });

  it('says All set! for a scheduled post rather than celebrating a publish', async () => {
    const scheduled = post({ title: 'Going out later', status: 'scheduled' });
    fakePosts([scheduled]);
    localStorage.setItem(
      'ghost-last-scheduled-post',
      JSON.stringify({ id: scheduled.id, type: 'post' }),
    );

    await renderAdminApp('/posts?type=scheduled', FLAG_ON);

    await expect.element(postsListScreen.celebrationModal()).toHaveTextContent('All set!');
  });

  /**
   * The key is cleared as it is read, before anything is fetched. Ember
   * clears it after the modal opens, so a failed request leaves it in place
   * and the celebration re-fires on every visit until one happens to succeed.
   */
  it('consumes the key so the same post is not celebrated twice', async () => {
    const published = post({ title: 'Just published', status: 'published' });
    fakePosts([published]);
    localStorage.setItem(
      'ghost-last-published-post',
      JSON.stringify({ id: published.id, type: 'post' }),
    );

    await renderAdminApp('/posts?type=published', FLAG_ON);
    await expect.element(postsListScreen.celebrationModal()).toBeVisible();

    expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
  });

  it('shows nothing when the editor left no key', async () => {
    fakePosts([post({ title: 'An ordinary post', status: 'published' })]);
    await renderAdminApp('/posts?type=published', FLAG_ON);
    await expect.element(postsListScreen.listItems().first()).toBeVisible();

    await expect(postsListScreen.celebrationModal()).toHaveCount(0);
  });

  // Malformed JSON must not throw on every mount for the rest of the session.
  it('survives a key it cannot parse, and clears it', async () => {
    fakePosts([post({ title: 'An ordinary post', status: 'published' })]);
    localStorage.setItem('ghost-last-published-post', 'not json');

    await renderAdminApp('/posts?type=published', FLAG_ON);
    await expect.element(postsListScreen.listItems().first()).toBeVisible();

    await expect(postsListScreen.celebrationModal()).toHaveCount(0);
    expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
  });
});
