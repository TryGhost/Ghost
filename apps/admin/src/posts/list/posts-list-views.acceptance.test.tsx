import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  currentRoute,
  fakeEditSettings,
  fakePosts,
  fakePostsListScreen,
  renderAdminApp,
  settingsResponse,
  type EditSettingsCapture,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { sidebarScreen } from '@/layout/sidebar.screen';
import { postsListScreen } from './posts-list.screen';
import { clearStickyPostFilters } from './posts-sticky-filters';

interface StoredView {
  name: string;
  route: 'posts';
  color: string;
  filter: Record<string, string>;
}

const publicPosts: StoredView = {
  name: 'Public posts',
  route: 'posts',
  color: 'green',
  filter: { visibility: 'public' },
};
const publicPublished: StoredView = {
  name: 'Public published',
  route: 'posts',
  color: 'blue',
  filter: { type: 'published', visibility: 'public' },
};
const membersOnly: StoredView = {
  name: 'Members only',
  route: 'posts',
  color: 'red',
  filter: { visibility: 'members' },
};

/** Views saved before the test, in the `shared_views` setting's stored form. */
function withSavedViews(...views: StoredView[]): RenderAdminAppOptions {
  return {
    boot: {
      browseSettings: {
        response: settingsResponse({ settings: { shared_views: JSON.stringify(views) } }),
      },
    },
  };
}

/** The current route's query, independent of param order. */
function routeParams(): Record<string, string> {
  const [, query = ''] = currentRoute().split('?');
  return Object.fromEntries(new URLSearchParams(query));
}

/**
 * Saved views span two surfaces: the list's save/edit popover writes the
 * shared `shared_views` setting, and the sidebar lists the views and marks the
 * one whose five params match the URL. Both are React-owned, so one render
 * covers the round trip.
 */
describe('Posts saved views', () => {
  let settingsApi: EditSettingsCapture;

  beforeEach(() => {
    fakePostsListScreen();
    fakePosts([]);
    settingsApi = fakeEditSettings();
  });

  afterEach(() => {
    clearStickyPostFilters();
  });

  it('saves the filters verbatim, beside the existing views, and selects the new view', async () => {
    await renderAdminApp(
      '/posts?type=published&visibility=members&author=ada&tag=news&order=published_at+asc',
      withSavedViews(publicPosts),
    );

    await postsListScreen.saveView('Paid news', 'purple');

    await expect(settingsApi).toHaveEditedSettings([
      {
        key: 'shared_views',
        value: JSON.stringify([
          publicPosts,
          {
            name: 'Paid news',
            route: 'posts',
            color: 'purple',
            filter: {
              type: 'published',
              visibility: 'members',
              author: 'ada',
              tag: 'news',
              order: 'published_at asc',
            },
          },
        ]),
      },
    ]);
    await expect
      .element(sidebarScreen.navLink('Paid news'))
      .toHaveAttribute('aria-current', 'page');
    await expect.poll(() => sidebarScreen.viewColor('Paid news')).toBe('purple');
    await expect.poll(() => sidebarScreen.viewColor('Public posts')).toBe('green');
  });

  it('refuses a duplicate name, ignoring case, without saving', async () => {
    await renderAdminApp('/posts?visibility=members', withSavedViews(publicPosts));

    await postsListScreen.saveView('public POSTS');

    await expect
      .element(postsListScreen.viewError())
      .toHaveTextContent('A view with this name already exists');
    await expect.element(postsListScreen.viewNameInput()).toBeVisible();
    expect(settingsApi.requests).toHaveLength(0);
  });

  it('renames and recolours the active view in place', async () => {
    await renderAdminApp('/posts?visibility=members', withSavedViews(publicPosts, membersOnly));
    await expect.element(postsListScreen.manageViewButton()).toHaveTextContent('Edit view');

    await postsListScreen.saveView('Members-only posts', 'teal');

    await expect(settingsApi).toHaveEditedSettings([
      {
        key: 'shared_views',
        value: JSON.stringify([
          publicPosts,
          {
            name: 'Members-only posts',
            route: 'posts',
            color: 'teal',
            filter: { visibility: 'members' },
          },
        ]),
      },
    ]);
    await expect.element(sidebarScreen.navLink('Members only')).not.toBeInTheDocument();
    await expect
      .element(sidebarScreen.navLink('Members-only posts'))
      .toHaveAttribute('aria-current', 'page');
    await expect.poll(() => sidebarScreen.viewColor('Members-only posts')).toBe('teal');
  });

  it('deletes one view, leaves the others in the sidebar, and returns to all posts', async () => {
    await renderAdminApp(
      '/posts?visibility=members',
      withSavedViews(publicPosts, membersOnly, publicPublished),
    );
    await expect
      .element(sidebarScreen.navLink('Members only'))
      .toHaveAttribute('aria-current', 'page');

    await postsListScreen.deleteView();

    await expect(settingsApi).toHaveEditedSettings([
      { key: 'shared_views', value: JSON.stringify([publicPosts, publicPublished]) },
    ]);
    await expect.element(sidebarScreen.navLink('Members only')).not.toBeInTheDocument();
    await expect.element(sidebarScreen.navLink('Public posts')).toBeVisible();
    await expect.element(sidebarScreen.navLink('Public published')).toBeVisible();
    await expect.poll(currentRoute).toBe('/posts');
    await expect.element(sidebarScreen.navLink('Posts')).toHaveAttribute('aria-current', 'page');
  });

  it('resets edited filters to the saved ones when the view is clicked again', async () => {
    await renderAdminApp('/posts?visibility=public', withSavedViews(publicPosts));
    await expect
      .element(sidebarScreen.navLink('Public posts'))
      .toHaveAttribute('aria-current', 'page');

    await postsListScreen.addFilter('Post type', 'Draft posts');
    await expect.poll(routeParams).toEqual({ type: 'draft', visibility: 'public' });
    await expect.element(sidebarScreen.navLink('Public posts')).not.toHaveAttribute('aria-current');

    await sidebarScreen.navLink('Public posts').click();

    await expect.poll(routeParams).toEqual({ visibility: 'public' });
    await expect.element(postsListScreen.filterBar()).not.toHaveTextContent('Draft posts');
    await expect
      .element(sidebarScreen.navLink('Public posts'))
      .toHaveAttribute('aria-current', 'page');
  });

  it('moves the active state to the view the edited filters now match', async () => {
    await renderAdminApp('/posts?visibility=public', withSavedViews(publicPosts, publicPublished));
    await expect
      .element(sidebarScreen.navLink('Public posts'))
      .toHaveAttribute('aria-current', 'page');

    await postsListScreen.addFilter('Post type', 'Published posts');

    await expect
      .element(sidebarScreen.navLink('Public published'))
      .toHaveAttribute('aria-current', 'page');
    await expect.element(sidebarScreen.navLink('Public posts')).not.toHaveAttribute('aria-current');
    expect(settingsApi.requests).toHaveLength(0);
  });
});
