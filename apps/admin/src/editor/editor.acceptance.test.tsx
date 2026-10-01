import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';

import {
  currentRoute,
  fakeAdminEndpoint,
  fakeEditorChrome,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  post,
  renderAdminApp,
  tag,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { postsListScreen } from '@/posts/list/posts-list.screen';
import { clearStickyPostFilters } from '@/posts/list/posts-sticky-filters';

const FLAG_ON = { labs: { editorReact: true } };
const FLAG_OFF = { labs: { editorReact: false } };

/**
 * `EmberRoot` reparents the `#ember-app` stand-in out of `body` into its own
 * wrapper and leaves that wrapper `hidden` until a route registers an Ember
 * fallback, so both conditions have to hold — the stand-in is still parented to
 * `body` on a React route.
 */
function emberShellShown(): boolean {
  const app = document.getElementById('ember-app');
  const emberRoot = app?.parentElement;
  if (!app || !emberRoot || emberRoot === document.body) {
    return false;
  }
  return !emberRoot.hidden && app.checkVisibility();
}

/**
 * The editor route mounts only when its feature flag is enabled. Disabled and
 * missing flags leave it unmounted.
 */
describe('Editor flag', () => {
  function fakeEditorWorld() {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, { posts: [post({ id: 'abc123' })] });
    fakeAdminEndpoint('GET', /^\/pages\/abc123\/\?/, { pages: [post({ id: 'abc123' })] });
  }

  it('renders the React editor when the flag is on', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/post/abc123', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
    await expect.element(editorScreen.backLink('post')).toHaveAttribute('href', '#/posts');
  });

  it('serves a new-post URL too', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/post', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
  });

  it('returns page editors to the pages list', async () => {
    fakeEditorWorld();
    await renderAdminApp('/editor/page/abc123', FLAG_ON);

    await expect.element(editorScreen.root()).toBeVisible();
    await expect.element(editorScreen.backLink('page')).toHaveAttribute('href', '#/pages');
  });

  it('leaves the editor route to Ember when the flag is off', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post/abc123', FLAG_OFF);

    await expect.poll(emberShellShown).toBe(true);
    await expect(editorScreen.root()).toHaveCount(0);
  });

  it('leaves the editor route to Ember when the flag is absent', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post/abc123');

    await expect.poll(emberShellShown).toBe(true);
    await expect(editorScreen.root()).toHaveCount(0);
  });
});

/**
 * An editor opened from post analytics or the analytics screens leads back
 * there, query string included, in place of the list it belongs to.
 */
describe('Editor analytics breadcrumb', () => {
  function fakePublishedPost(overrides: Partial<ReturnType<typeof post>> = {}) {
    fakeEditorChrome();
    fakeAdminEndpoint('GET', /^\/posts\/abc123\/\?/, {
      posts: [
        post({
          id: 'abc123',
          title: 'Published Post',
          status: 'published',
          lexical: buildLexicalParagraph('Published Post'),
          published_at: '2026-01-01T00:00:00.000Z',
          ...overrides,
        }),
      ],
    });
  }

  it.each([
    { from: 'the post analytics root', editorReturn: '/posts/analytics/abc123' },
    { from: 'a post analytics subpage', editorReturn: '/posts/analytics/abc123/web' },
    { from: 'the stats root', editorReturn: '/analytics' },
    { from: 'a stats subpage', editorReturn: '/analytics/web' },
    {
      from: 'a stats subpage with query params',
      editorReturn: '/analytics/growth?tab=total-members',
    },
  ])('leads back to $from', async ({ editorReturn }) => {
    fakePublishedPost();
    await renderAdminApp('/editor/post/abc123', { ...FLAG_ON, locationState: { editorReturn } });

    await expect
      .element(editorScreen.analyticsBackLink())
      .toHaveAttribute('href', `#${editorReturn}`);
    await expect(editorScreen.backLink('post')).toHaveCount(0);
  });

  it('does not lead back to analytics for a new post', async () => {
    fakeEditorChrome();
    await renderAdminApp('/editor/post', {
      ...FLAG_ON,
      locationState: { editorReturn: '/posts/analytics/abc123' },
    });

    await expect.element(editorScreen.backLink('post')).toHaveAttribute('href', '#/posts');
    await expect.element(editorScreen.status()).toHaveTextContent('New');
    await expect(editorScreen.analyticsBackLink()).toHaveCount(0);
  });

  it.each([
    '/analyticsfoo',
    '/members',
    'https://example.com/analytics',
    '//example.com/analytics',
    '/analytics/../members',
    '/posts/analytics/abc123/..',
  ])('ignores the return path %s', async (editorReturn) => {
    fakePublishedPost();
    await renderAdminApp('/editor/post/abc123', { ...FLAG_ON, locationState: { editorReturn } });

    await expect.element(editorScreen.backLink('post')).toHaveAttribute('href', '#/posts');
    await expect(editorScreen.analyticsBackLink()).toHaveCount(0);
  });

  it('hides the status line unless the newsletter failed', async () => {
    fakePublishedPost();
    await renderAdminApp('/editor/post/abc123', {
      ...FLAG_ON,
      locationState: { editorReturn: '/posts/analytics/abc123' },
    });

    await expect.element(editorScreen.analyticsBackLink()).toBeVisible();
    await expect(editorScreen.status()).toHaveCount(0);
  });

  it('keeps the status line when the newsletter failed', async () => {
    fakePublishedPost({
      email: { id: 'email-1', status: 'failed', email_count: 20, opened_count: 0 },
    });
    await renderAdminApp('/editor/post/abc123', {
      ...FLAG_ON,
      locationState: { editorReturn: '/posts/analytics/abc123' },
    });

    await expect.element(editorScreen.analyticsBackLink()).toBeVisible();
    await expect
      .element(editorScreen.status())
      .toHaveTextContent('Published but failed to send newsletter.');
  });

  it('keeps the status line when a save fails', async () => {
    fakePublishedPost();
    fakeAdminEndpoint(
      'PUT',
      /^\/posts\/abc123\/\?/,
      { errors: [{ type: 'InternalServerError' }] },
      { status: 500 },
    );
    await renderAdminApp('/editor/post/abc123', {
      ...FLAG_ON,
      locationState: { editorReturn: '/posts/analytics/abc123' },
    });

    await expect.element(editorScreen.analyticsBackLink()).toBeVisible();
    await expect(editorScreen.status()).toHaveCount(0);
    await editorScreen.body().click();
    await userEvent.keyboard('{End} more');
    await userEvent.keyboard('{Meta>}s{/Meta}');

    await expect
      .element(editorScreen.status())
      .toHaveTextContent('Something went wrong while loading posts');
  });
});

describe('Editor list breadcrumb', () => {
  afterEach(clearStickyPostFilters);

  it.each([
    { postType: 'post', returnWith: 'breadcrumb' },
    { postType: 'page', returnWith: 'breadcrumb' },
    { postType: 'post', returnWith: 'back' },
    { postType: 'page', returnWith: 'back' },
  ] as const)(
    'returns a $postType to its filtered list with the same sort order using $returnWith',
    async ({ postType, returnWith }) => {
      const resource = postType === 'post' ? 'posts' : 'pages';
      const entry = post({ id: 'abc123', title: 'Engineering update', status: 'draft' });
      fakeEditorChrome();
      fakePostsListScreen();
      const listApi = (postType === 'post' ? fakePosts : fakePages)([entry]);
      fakeAdminEndpoint('GET', new RegExp(`^/${resource}/abc123/\\?`), { [resource]: [entry] });
      fakeAdminEndpoint('GET', /^\/tags\/\?.*slug/, {
        tags: [tag({ name: 'Engineering', slug: 'engineering' })],
      });
      const listUrl = `/${resource}?type=draft&tag=engineering&order=title+asc`;
      await renderAdminApp(listUrl, { labs: { editorReact: true } });

      await expect.element(postsListScreen.filterBar()).toHaveTextContent('Engineering');
      await postsListScreen.listItems().first().click();
      await expect.element(editorScreen.root()).toBeVisible();
      await expect.element(editorScreen.backLink(postType)).toHaveAttribute('href', `#${listUrl}`);
      if (returnWith === 'breadcrumb') {
        await editorScreen.backLink(postType).click();
      } else {
        window.history.back();
      }

      await expect.poll(currentRoute).toBe(listUrl);
      await expect.element(postsListScreen.filterBar()).toHaveTextContent('Engineering');
      expect(
        listApi.requests.some(
          (request) => request.filter?.includes('tag:engineering') && request.order === 'title asc',
        ),
      ).toBe(true);
    },
  );
});
