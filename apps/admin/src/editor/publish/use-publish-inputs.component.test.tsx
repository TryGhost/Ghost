import { describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { InAppProviders, fakeAdminEndpoint, newsletter } from '@test-utils/acceptance';

import { usePublishInputs } from '@/editor/publish/use-publish-inputs';
import { useEditorSettings } from '@/editor/use-editor-settings';

const pagination = (pageNumber = 1, pages = 1) => ({
  page: pageNumber,
  limit: 100,
  pages,
  total: pages,
  next: pageNumber < pages ? pageNumber + 1 : null,
  prev: pageNumber > 1 ? pageNumber - 1 : null,
});

const publishNewsletter = (slug: string) =>
  newsletter({
    slug,
    name: slug,
    status: 'active',
    visibility: 'members',
    sort_order: 0,
  });

function fakeBoundaryInputs() {
  const settings = fakeAdminEndpoint('GET', /^\/settings\/\?/, {
    settings: [
      { key: 'members_signup_access', value: 'all' },
      { key: 'editor_default_email_recipients', value: 'visibility' },
      { key: 'timezone', value: 'Etc/UTC' },
      // Core always includes this array-valued calculated setting in the members group.
      { key: 'all_blocked_email_domains', value: [] },
    ],
  });
  const config = fakeAdminEndpoint('GET', /^\/config\/(?:\?.*)?$/, {
    config: { mailgunIsConfigured: true },
  });
  const currentUser = fakeAdminEndpoint('GET', /^\/users\/me\/\?include=roles$/, {
    users: [{ roles: [{ name: 'Administrator' }] }],
  });

  return { settings, config, currentUser };
}

function fakeNewsletters() {
  return fakeAdminEndpoint('GET', /^\/newsletters\/\?/, {
    newsletters: [publishNewsletter('weekly')],
    meta: { pagination: pagination() },
  });
}

function fakeMemberCount(total: number, status = 200) {
  return fakeAdminEndpoint(
    'GET',
    /^\/members\/\?.*filter=/,
    status === 200
      ? { members: [], meta: { pagination: { ...pagination(), total } } }
      : { errors: [{ message: 'Members are offline' }] },
    { status },
  );
}

describe('usePublishInputs', () => {
  it('keeps valid inputs ready while settings refresh in the background', async () => {
    fakeBoundaryInputs();
    fakeNewsletters();
    fakeMemberCount(20);
    const hook = await renderHook(
      () => ({
        ...usePublishInputs(),
        refetchSettings: useEditorSettings().refetch,
      }),
      { wrapper: InAppProviders },
    );
    await expect.poll(() => hook.result.current.isReady).toBe(true);

    let releaseSettings: () => void = () => {};
    const settingsHeld = new Promise<void>((resolve) => {
      releaseSettings = resolve;
    });
    const refreshedSettings = fakeAdminEndpoint('GET', /^\/settings\/\?/, async () => {
      await settingsHeld;
      return {
        settings: [
          { key: 'members_signup_access', value: 'none' },
          { key: 'editor_default_email_recipients', value: 'visibility' },
          { key: 'timezone', value: 'Etc/UTC' },
        ],
      };
    });

    try {
      await hook.act(() => {
        void hook.result.current.refetchSettings();
      });
      await expect.poll(() => refreshedSettings.requests.length).toBe(1);

      expect(hook.result.current.isReady).toBe(true);
      expect(hook.result.current.site.membersEnabled).toBe(true);
      expect(hook.result.current.error).toBeNull();
    } finally {
      releaseSettings();
    }

    await expect.poll(() => hook.result.current.site.membersEnabled).toBe(false);
    expect(hook.result.current.isReady).toBe(true);
  });

  it.each(['failed', 'invalid'] as const)(
    'blocks previously ready inputs after a %s settings refresh',
    async (response) => {
      fakeBoundaryInputs();
      fakeNewsletters();
      fakeMemberCount(20);
      const hook = await renderHook(() => usePublishInputs(), { wrapper: InAppProviders });
      await expect.poll(() => hook.result.current.isReady).toBe(true);

      const refreshedSettings = fakeAdminEndpoint(
        'GET',
        /^\/settings\/\?/,
        response === 'failed'
          ? { errors: [{ message: 'Settings are offline' }] }
          : { settings: [{ key: 'editor_default_email_recipients', value: 'invalid' }] },
        { status: response === 'failed' ? 500 : 200 },
      );
      await hook.act(() => hook.result.current.retry());

      await expect.poll(() => refreshedSettings.requests.length).toBe(1);
      await expect.poll(() => hook.result.current.error !== null).toBe(true);
      expect(hook.result.current.isReady).toBe(false);
    },
  );

  it('blocks on a member-count error and becomes ready after retry', async () => {
    const inputs = fakeBoundaryInputs();
    fakeNewsletters();
    const failedMembers = fakeMemberCount(0, 500);
    const hook = await renderHook(() => usePublishInputs(), { wrapper: InAppProviders });

    await expect.poll(() => inputs.settings.requests.length).toBe(1);
    await expect.poll(() => inputs.config.requests.length).toBe(1);
    await expect.poll(() => inputs.currentUser.requests.length).toBe(1);
    await expect
      .poll(() => hook.result.current.error?.message ?? '')
      .toContain('Something went wrong while loading members');
    expect(hook.result.current.isReady).toBe(false);
    expect(failedMembers.requests).toHaveLength(1);

    const retriedMembers = fakeMemberCount(500);
    let releaseConfig: () => void = () => {};
    const configHeld = new Promise<void>((resolve) => {
      releaseConfig = resolve;
    });
    const retriedConfig = fakeAdminEndpoint('GET', /^\/config\/(?:\?.*)?$/, async () => {
      await configHeld;
      return { config: { mailgunIsConfigured: true } };
    });
    await hook.act(() => hook.result.current.retry());

    await expect.poll(() => retriedMembers.requests.length).toBe(1);
    await expect.poll(() => retriedConfig.requests.length).toBe(1);
    await expect.poll(() => hook.result.current.site.memberCount).toBe(500);
    expect(hook.result.current.isReady).toBe(false);

    releaseConfig();
    await expect.poll(() => hook.result.current.isReady).toBe(true);
    expect(hook.result.current.error).toBeNull();
  });

  it('loads every newsletter page before becoming ready', async () => {
    fakeBoundaryInputs();
    fakeMemberCount(20);
    let releaseLastPage: () => void = () => {};
    const lastPageHeld = new Promise<void>((resolve) => {
      releaseLastPage = resolve;
    });
    const newslettersApi = fakeAdminEndpoint('GET', /^\/newsletters\/\?/, async ({ url }) => {
      const pageNumber = Number(new URL(url).searchParams.get('page') ?? '1');
      if (pageNumber === 2) {
        await lastPageHeld;
      }

      return {
        newsletters: [publishNewsletter(pageNumber === 1 ? 'first' : 'last')],
        meta: { pagination: pagination(pageNumber, 2) },
      };
    });
    const hook = await renderHook(() => usePublishInputs(), { wrapper: InAppProviders });

    await expect.poll(() => newslettersApi.requests.length).toBe(2);
    expect(hook.result.current.isReady).toBe(false);

    releaseLastPage();
    await expect.poll(() => hook.result.current.isReady).toBe(true);
    expect(hook.result.current.site.newsletters.map(({ slug }) => slug)).toEqual(['first', 'last']);
    expect(newslettersApi.requests).toHaveLength(2);
    expect(new URL(newslettersApi.requests[1].url).searchParams.get('page')).toBe('2');
  });

  it('reports an expired newsletter read instead of leaving the page', async () => {
    const { pathname } = window.location;
    fakeBoundaryInputs();
    fakeMemberCount(20);
    const newslettersApi = fakeAdminEndpoint(
      'GET',
      /^\/newsletters\/\?/,
      { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
      { status: 401 },
    );
    const hook = await renderHook(() => usePublishInputs(), { wrapper: InAppProviders });

    await expect.poll(() => newslettersApi.requests.length).toBeGreaterThan(0);
    await expect.poll(() => hook.result.current.error !== null).toBe(true);
    expect(hook.result.current.isReady).toBe(false);
    expect(window.location.pathname).toBe(pathname);
  });
});
