import { beforeEach, describe, expect, it } from 'vitest';
import {
  configResponse,
  fakeAdminEndpoint,
  fakePages,
  fakePostsListScreen,
  post,
  renderAdminApp,
  settingsResponse,
  siteResponse,
} from '@test-utils/acceptance';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';
import { metaMouseDown, postsListScreen } from './posts-list.screen';

const FLAG_ON = { labs: { postsListReact: true } };
const publishedPage = (slug: string) => post({ title: slug, slug, status: 'published' });

// Persist writes across the hook's read-before-write refresh, just like the API.
function navigationApi(primary = '[]', secondary = '[]') {
  const data = settingsResponse({
    ...FLAG_ON,
    settings: { navigation: primary, secondary_navigation: secondary },
  });
  const write = fakeAdminEndpoint('PUT', '/settings/', ({ body }) => {
    for (const setting of (body as { settings: Setting[] }).settings) {
      Object.assign(
        data.settings.find(({ key }) => key === setting.key)!,
        setting,
      );
    }
    return data;
  });
  return {
    data,
    write,
    boot: { browseSettings: { response: () => data } },
    primary: (): unknown =>
      JSON.parse(data.settings.find(({ key }) => key === 'navigation')!.value as string),
    secondary: (): unknown =>
      JSON.parse(data.settings.find(({ key }) => key === 'secondary_navigation')!.value as string),
  };
}

async function choose(label: string) {
  await postsListScreen.listItems().first().click({ button: 'right' });
  await postsListScreen.contextMenuItem(label).click();
}

describe('React pages list navigation', () => {
  beforeEach(() => fakePostsListScreen());

  it('adds, moves and removes a page, updating its indicator after each save', async () => {
    fakePages([publishedPage('about')]);
    const api = navigationApi();
    // No pageRoutes in this config: older Ghost backends remain supported.
    await renderAdminApp('/pages?type=published', { ...FLAG_ON, boot: api.boot });

    await choose('Add to primary navigation');
    await expect
      .element(postsListScreen.listItems().first())
      .toHaveTextContent('In primary navigation');
    expect(api.primary()).toEqual([{ label: 'about', url: '/about/' }]);

    await choose('Move to secondary navigation');
    await expect
      .element(postsListScreen.listItems().first())
      .toHaveTextContent('In secondary navigation');
    expect(api.primary()).toEqual([]);
    expect(api.secondary()).toEqual([{ label: 'about', url: '/about/' }]);

    await choose('Remove from navigation');
    await expect
      .element(postsListScreen.listItems().first())
      .not.toHaveTextContent('In secondary navigation');
    expect(api.secondary()).toEqual([]);
    expect(api.write.requests).toHaveLength(3);
  });

  it('recognizes custom-route aliases on subdirectory sites and preserves menu metadata when moving', async () => {
    fakePages([publishedPage('home')]);
    const item = {
      label: 'Welcome',
      url: 'http://test.com/blog/home/?ref=nav',
      icon: 'house',
      visibility: 'members',
    };
    const outside = { label: 'Outside', url: 'http://test.com/home/' };
    const api = navigationApi(JSON.stringify([outside, item]));
    const config = configResponse();
    const site = siteResponse();
    site.site.url = 'http://test.com/blog/';
    await renderAdminApp('/pages?type=published', {
      ...FLAG_ON,
      boot: {
        ...api.boot,
        browseConfig: { response: { config: { ...config.config, pageRoutes: { home: '/' } } } },
        browseSite: { response: site },
      },
    });

    await expect
      .element(postsListScreen.listItems().first())
      .toHaveTextContent('In primary navigation');
    await choose('Move to secondary navigation');
    await expect
      .element(postsListScreen.listItems().first())
      .toHaveTextContent('In secondary navigation');
    expect(api.primary()).toEqual([outside]);
    expect(api.secondary()).toEqual([item]);
    await postsListScreen.listItems().first().click({ button: 'right' });
    await expect
      .element(postsListScreen.contextMenuItem('Move to primary navigation'))
      .toBeVisible();
  });

  it('refreshes settings and custom routes before saving', async () => {
    fakePages([publishedPage('about')]);
    const api = navigationApi();
    let pageRoutes: Record<string, string> = {};
    await renderAdminApp('/pages?type=published', {
      ...FLAG_ON,
      boot: {
        ...api.boot,
        browseConfig: { response: () => ({ config: { ...configResponse().config, pageRoutes } }) },
      },
    });
    await expect.element(postsListScreen.listItems().first()).toBeVisible();
    // Another session edited navigation and uploaded new routes after this list loaded.
    api.data.settings.find(({ key }) => key === 'navigation')!.value =
      '[{"label":"News","url":"/news/"}]';
    pageRoutes = { about: '/company/' };
    await choose('Add to primary navigation');
    await expect
      .element(postsListScreen.listItems().first())
      .toHaveTextContent('In primary navigation');
    expect(api.primary()).toEqual([
      { label: 'News', url: '/news/' },
      { label: 'about', url: '/company/' },
    ]);
  });

  it('updates all selected published pages in one write without reordering existing items', async () => {
    fakePages([publishedPage('about'), publishedPage('contact')]);
    const existing = [
      { label: 'About us', url: '/about/' },
      { label: 'News', url: '/news/' },
    ];
    const api = navigationApi(JSON.stringify(existing));
    await renderAdminApp('/pages?type=published', { ...FLAG_ON, boot: api.boot });
    const rows = postsListScreen.listItems();
    await expect.element(rows.nth(1)).toBeVisible();
    metaMouseDown(rows.nth(0).element());
    metaMouseDown(rows.nth(1).element());
    await expect.poll(() => postsListScreen.selectedTitles()).toHaveLength(2);

    await choose('Add to primary navigation');
    await expect.element(rows.nth(1)).toHaveTextContent('In primary navigation');
    expect(api.primary()).toEqual([...existing, { label: 'contact', url: '/contact/' }]);
    expect(api.write.requests).toHaveLength(1);
  });

  it('keeps the existing indicator and menu intact after a failed save', async () => {
    fakePages([publishedPage('about')]);
    fakeAdminEndpoint(
      'PUT',
      '/settings/',
      { errors: [{ message: 'Navigation could not be saved', type: 'ValidationError' }] },
      { status: 422 },
    );
    const data = settingsResponse({
      ...FLAG_ON,
      settings: { navigation: '[{"label":"About","url":"/about/"}]', secondary_navigation: '[]' },
    });
    await renderAdminApp('/pages?type=published', {
      ...FLAG_ON,
      boot: { browseSettings: { response: data } },
    });

    await choose('Move to secondary navigation');
    await expect
      .element(postsListScreen.toastWithText('Navigation could not be saved'))
      .toBeVisible();
    await expect
      .element(postsListScreen.listItems().first())
      .toHaveTextContent('In primary navigation');
    await postsListScreen.listItems().first().click({ button: 'right' });
    await expect
      .element(postsListScreen.contextMenuItem('Move to secondary navigation'))
      .toBeEnabled();
  });

  it('does not offer edits when navigation settings are read-only', async () => {
    fakePages([publishedPage('about')]);
    const api = navigationApi();
    Object.assign(
      api.data.settings.find(({ key }) => key === 'navigation')!,
      { is_read_only: true },
    );
    await renderAdminApp('/pages?type=published', { ...FLAG_ON, boot: api.boot });
    await postsListScreen.listItems().first().click({ button: 'right' });
    await expect.element(postsListScreen.contextMenuItem('Duplicate')).toBeVisible();
    await expect(postsListScreen.contextMenuItem('Add to primary navigation')).toHaveCount(0);
    expect(api.write.requests).toHaveLength(0);
  });
});
