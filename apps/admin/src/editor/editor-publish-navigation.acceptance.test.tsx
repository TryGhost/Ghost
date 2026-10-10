import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { buildLexicalParagraph } from '@tryghost/test-data';
import type { Setting } from '@tryghost/admin-x-framework/api/settings';

import {
  configResponse,
  currentRoute,
  currentUserResponse,
  fakeAdminEndpoint,
  fakeEmailPreview,
  fakeNewsletters,
  fakePages,
  fakePosts,
  fakePostsListScreen,
  fakeSnippets,
  fakeTiers,
  post,
  renderAdminApp,
  settingsResponse,
  staffRole,
  type EndpointCapture,
  type RenderAdminAppOptions,
} from '@test-utils/acceptance';
import { editorScreen } from '@/editor/editor.screen';
import { publishScreen } from '@/editor/publish/publish.screen';
import { NAVIGATION_SAVE_FAILED } from '@/editor/publish/use-publish-flow';

const PAGE_ID = 'abc123';
const CURRENT_USER_ID = String(currentUserResponse().users[0].id);

afterEach(() => {
  localStorage.removeItem('ghost-last-published-post');
  localStorage.removeItem('ghost-last-scheduled-post');
});

/** The reads behind the publish inputs and the page list a publish returns to. */
function publishChrome() {
  fakeSnippets([]);
  fakeEmailPreview();
  fakePosts([]);
  fakePages([]);
  fakePostsListScreen();
  fakeTiers([]);
  fakeNewsletters([]);
  fakeAdminEndpoint('GET', /^\/members\/\?.*order=id/, {
    members: [],
    meta: { pagination: { page: 1, limit: 1, pages: 1, total: 0, next: null, prev: null } },
  });
}

/** A draft that saves the way Ghost does, read back with whatever was saved last. */
function fakeSavableDraft(
  resource: 'pages' | 'posts',
  { title, slug }: { title: string; slug: string },
) {
  let current: Record<string, unknown> = post({
    id: PAGE_ID,
    title,
    slug,
    status: 'draft',
    lexical: buildLexicalParagraph('Hello'),
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: null,
    tags: [],
    authors: [{ id: CURRENT_USER_ID }],
  });
  let saves = 0;
  const route = new RegExp(`^/${resource}/${PAGE_ID}/\\?`);

  fakeAdminEndpoint('GET', route, () => ({ [resource]: [current] }));
  return fakeAdminEndpoint('PUT', route, ({ body }) => {
    saves += 1;
    const submitted = (body as Record<string, Record<string, unknown>[]>)[resource][0];
    current = { ...current, ...submitted, updated_at: `2026-01-01T00:00:0${saves}.000Z` };
    return { [resource]: [current] };
  });
}

/** The status the latest page save sent. */
function savedStatus(capture: EndpointCapture): unknown {
  const body = capture.requests.at(-1)?.body as { pages: Array<{ status?: string }> } | undefined;
  return body?.pages[0]?.status;
}

/** Site settings whose menus persist writes, so the read before each write sees the last one. */
function navigationApi(
  primary: unknown[] = [
    { label: 'Home', url: '/' },
    { label: 'About', url: '/about/' },
  ],
  secondary: unknown[] = [],
) {
  const data = settingsResponse({
    settings: {
      navigation: JSON.stringify(primary),
      secondary_navigation: JSON.stringify(secondary),
    },
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
  const menu = (key: string): unknown =>
    JSON.parse(data.settings.find((setting) => setting.key === key)!.value as string);

  return {
    write,
    boot: { browseSettings: { response: () => data } },
    primary: () => menu('navigation'),
    secondary: () => menu('secondary_navigation'),
  };
}

function withPageRoutes(pageRoutes: Record<string, string>) {
  return { browseConfig: { response: { config: { ...configResponse().config, pageRoutes } } } };
}

async function openPublishFlow(
  {
    title,
    slug,
    resource = 'pages',
  }: { title: string; slug: string; resource?: 'pages' | 'posts' },
  options: RenderAdminAppOptions,
) {
  publishChrome();
  const saveApi = fakeSavableDraft(resource, { title, slug });
  await renderAdminApp(`/editor/${resource === 'pages' ? 'page' : 'post'}/${PAGE_ID}`, options);
  await expect.element(editorScreen.publishButton()).toBeEnabled();
  await editorScreen.publishButton().click();
  await expect.element(publishScreen.options()).toBeVisible();
  return saveApi;
}

async function choosePlacement(label: 'None' | 'Primary' | 'Secondary') {
  await publishScreen.setting('navigation').click();
  await publishScreen.navigationPlacement(label).click();
}

async function publish() {
  await publishScreen.continueButton().click();
  await expect.element(publishScreen.confirm()).toBeVisible();
  await publishScreen.confirmButton().click();
  await expect.poll(currentRoute).toBe('/pages');
}

describe('Editor publish flow: page navigation', () => {
  it('moves an existing slug link when publishing a custom-routed page', async () => {
    const api = navigationApi([{ label: 'Welcome', url: '/home/' }]);
    await openPublishFlow(
      { title: 'Home', slug: 'home' },
      { boot: { ...api.boot, ...withPageRoutes({ home: '/' }) } },
    );

    await expect.element(publishScreen.navigationSetting()).toHaveTextContent('Primary navigation');
    await choosePlacement('Secondary');
    await publish();

    expect(api.primary()).toEqual([]);
    expect(api.secondary()).toEqual([{ label: 'Welcome', url: '/home/' }]);
  });

  it('publishes a custom-routed homepage into navigation using its route', async () => {
    const api = navigationApi([]);
    await openPublishFlow(
      { title: 'Home', slug: 'home' },
      { boot: { ...api.boot, ...withPageRoutes({ home: '/' }) } },
    );

    await choosePlacement('Primary');
    await publish();

    expect(api.primary()).toEqual([{ label: 'Home', url: '/' }]);
  });

  it('offers a navigation placement option when publishing an unlinked page', async () => {
    const api = navigationApi();
    await openPublishFlow({ title: 'Partners', slug: 'partners' }, { boot: api.boot });

    await expect
      .element(publishScreen.navigationSetting())
      .toHaveTextContent('Not in site navigation');

    // The default is "not in navigation", so publishing leaves the menus alone.
    await publishScreen.continueButton().click();
    await expect.element(publishScreen.confirm()).not.toHaveTextContent('navigation');
    await publishScreen.confirmButton().click();
    await expect.poll(currentRoute).toBe('/pages');

    expect(api.write.requests).toHaveLength(0);
  });

  it('does not promise or apply navigation placement when scheduling', async () => {
    const api = navigationApi();
    const saveApi = await openPublishFlow(
      { title: 'Partners', slug: 'partners' },
      { boot: api.boot },
    );

    await choosePlacement('Primary');
    await publishScreen.setting('publish-at').click();
    await page.getByLabelText('Schedule for later').click();

    await expect(publishScreen.navigationSetting()).toHaveCount(0);

    await publishScreen.continueButton().click();
    await expect.element(publishScreen.confirm()).not.toHaveTextContent('navigation');
    await publishScreen.confirmButton().click();
    await expect.poll(currentRoute).toBe('/pages');

    expect(savedStatus(saveApi)).toBe('scheduled');
    expect(api.write.requests).toHaveLength(0);
  });

  it('adds the page to primary navigation when selected', async () => {
    // No pageRoutes in this config: older Ghost backends keep slug URLs.
    const api = navigationApi();
    const saveApi = await openPublishFlow(
      { title: 'Partners', slug: 'partners' },
      { boot: api.boot },
    );

    await choosePlacement('Primary');
    await expect.element(publishScreen.navigationSetting()).toHaveTextContent('Primary navigation');

    await publishScreen.continueButton().click();
    await expect
      .element(publishScreen.confirm())
      .toHaveTextContent('will be published on your site and listed in your primary navigation.');
    await publishScreen.confirmButton().click();
    await expect.poll(currentRoute).toBe('/pages');

    expect(savedStatus(saveApi)).toBe('published');
    expect(api.primary()).toContainEqual({ label: 'Partners', url: '/partners/' });
    expect(api.write.requests).toHaveLength(1);
  });

  it('adds the page to secondary navigation when selected', async () => {
    const api = navigationApi();
    await openPublishFlow({ title: 'Partners', slug: 'partners' }, { boot: api.boot });

    await choosePlacement('Secondary');
    await publish();

    expect(api.secondary()).toContainEqual({ label: 'Partners', url: '/partners/' });
    expect(api.primary()).not.toContainEqual(expect.objectContaining({ label: 'Partners' }));
  });

  it('pre-selects the current placement for an already-linked page', async () => {
    const api = navigationApi();
    await openPublishFlow({ title: 'About', slug: 'about' }, { boot: api.boot });

    await expect.element(publishScreen.navigationSetting()).toHaveTextContent('Primary navigation');

    // The confirmation still says where it will live, though nothing changes.
    await publishScreen.continueButton().click();
    await expect
      .element(publishScreen.confirm())
      .toHaveTextContent('listed in your primary navigation');
    await publishScreen.confirmButton().click();
    await expect.poll(currentRoute).toBe('/pages');

    expect(api.primary()).toContainEqual({ label: 'About', url: '/about/' });
    expect(api.write.requests).toHaveLength(0);
  });

  it('can move an already-linked page to a different menu when publishing', async () => {
    const api = navigationApi();
    await openPublishFlow({ title: 'About', slug: 'about' }, { boot: api.boot });

    await choosePlacement('Secondary');
    await publishScreen.continueButton().click();
    await expect
      .element(publishScreen.confirm())
      .toHaveTextContent('listed in your secondary navigation');
    await publishScreen.confirmButton().click();
    await expect.poll(currentRoute).toBe('/pages');

    expect(api.primary()).toEqual([{ label: 'Home', url: '/' }]);
    expect(api.secondary()).toEqual([{ label: 'About', url: '/about/' }]);
  });

  it('discards an unsaved navigation change when the flow is reopened', async () => {
    const api = navigationApi();
    await openPublishFlow({ title: 'Partners', slug: 'partners' }, { boot: api.boot });

    await choosePlacement('Primary');
    await expect.element(publishScreen.navigationSetting()).toHaveTextContent('Primary navigation');

    await publishScreen.closeButton().click();
    await expect(publishScreen.root()).toHaveCount(0);
    await editorScreen.publishButton().click();

    await expect
      .element(publishScreen.navigationSetting())
      .toHaveTextContent('Not in site navigation');
    expect(api.write.requests).toHaveLength(0);
  });

  it('can remove an already-linked page from navigation when publishing', async () => {
    const api = navigationApi();
    await openPublishFlow({ title: 'About', slug: 'about' }, { boot: api.boot });

    await choosePlacement('None');
    await publishScreen.continueButton().click();

    // "None" says nothing about navigation in the confirmation, but still removes the link.
    await expect.element(publishScreen.confirm()).not.toHaveTextContent('navigation');
    await publishScreen.confirmButton().click();
    await expect.poll(currentRoute).toBe('/pages');

    expect(api.primary()).toEqual([{ label: 'Home', url: '/' }]);
  });

  it('does not show the navigation option to editors', async () => {
    const api = navigationApi();
    const me = currentUserResponse();
    me.users[0].roles = [staffRole({ name: 'Editor' })];
    await openPublishFlow(
      { title: 'Partners', slug: 'partners' },
      { boot: { ...api.boot, browseMe: { response: me } } },
    );

    await expect.element(publishScreen.setting('publish-at')).toBeVisible();
    await expect(publishScreen.navigationSetting()).toHaveCount(0);

    await publish();
    expect(api.write.requests).toHaveLength(0);
  });

  it('does not show the navigation option for posts', async () => {
    const api = navigationApi();
    await openPublishFlow(
      { title: 'A post', slug: 'a-post', resource: 'posts' },
      { boot: api.boot },
    );

    await expect.element(publishScreen.setting('publish-at')).toBeVisible();
    await expect(publishScreen.navigationSetting()).toHaveCount(0);
  });

  it('does not show the navigation option while the menus are read-only', async () => {
    const api = navigationApi();
    const settings = api.boot.browseSettings.response();
    Object.assign(
      settings.settings.find(({ key }) => key === 'navigation')!,
      {
        is_read_only: true,
      },
    );
    await openPublishFlow({ title: 'Partners', slug: 'partners' }, { boot: api.boot });

    await expect.element(publishScreen.setting('publish-at')).toBeVisible();
    await expect(publishScreen.navigationSetting()).toHaveCount(0);
  });

  it('publishes the page and notifies when the navigation save fails', async () => {
    const api = navigationApi();
    const saveApi = await openPublishFlow(
      { title: 'Partners', slug: 'partners' },
      { boot: api.boot },
    );
    fakeAdminEndpoint(
      'PUT',
      '/settings/',
      { errors: [{ message: 'Could not save settings', type: 'InternalServerError' }] },
      { status: 500 },
    );

    await choosePlacement('Primary');
    await publish();

    expect(savedStatus(saveApi)).toBe('published');
    await expect.element(page.getByText(NAVIGATION_SAVE_FAILED)).toBeVisible();
    expect(api.primary()).not.toContainEqual(expect.objectContaining({ label: 'Partners' }));
  });
});
