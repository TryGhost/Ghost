import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  fakePages,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
  siteResponse,
} from '@test-utils/acceptance';
import { postsListScreen } from './posts-list.screen';

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

    await renderAdminApp('/posts?type=published');

    await expect.element(postsListScreen.celebrationModal()).toBeVisible();
    await expect.element(postsListScreen.celebrationModal()).toHaveTextContent('Just published');
    expect(localStorage.getItem('ghost-last-published-post')).toBeNull();
  });

  it.each(['https://example.com/publication-icon.png', ''])(
    'uses the configured publication icon (%s)',
    async (icon) => {
      const published = post({ title: 'Just published', status: 'published' });
      fakePosts([published]);
      localStorage.setItem(
        'ghost-last-published-post',
        JSON.stringify({ id: published.id, type: 'post' }),
      );
      const site = siteResponse();
      site.site.icon = icon;

      await renderAdminApp('/posts?type=published', {
        boot: { browseSite: { response: site } },
      });

      await expect.element(postsListScreen.celebrationModal()).toBeVisible();
      await expect
        .poll(() => {
          const title = Array.from(document.querySelectorAll('[role="dialog"] strong')).find(
            (element) => element.textContent === site.site.title,
          );
          const iconElement = title?.parentElement?.previousElementSibling;
          return iconElement instanceof HTMLElement ? iconElement.style.backgroundImage : null;
        })
        .toBe(icon ? `url("${icon}")` : null);
    },
  );

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

    await renderAdminApp('/pages?type=published');

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

    await renderAdminApp('/posts?type=scheduled');

    await expect.element(postsListScreen.celebrationModal()).toHaveTextContent('All set!');
  });

  it('shows nothing when the editor left no key', async () => {
    fakePosts([post({ title: 'An ordinary post', status: 'published' })]);
    await renderAdminApp('/posts?type=published');
    await expect.element(postsListScreen.listItems().first()).toBeVisible();

    await expect(postsListScreen.celebrationModal()).toHaveCount(0);
  });
});
