import { describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { fakeAdminEndpoint, newsletter } from '@test-utils/acceptance';
import { TestWrapper } from '@test-utils/fixtures/query-client';

import { usePublishInputs } from '@/editor/publish/use-publish-inputs';

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
  it('blocks on a member-count error and becomes ready after retry', async () => {
    const inputs = fakeBoundaryInputs();
    fakeNewsletters();
    const failedMembers = fakeMemberCount(0, 500);
    const hook = await renderHook(() => usePublishInputs(), { wrapper: TestWrapper });

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
    const hook = await renderHook(() => usePublishInputs(), { wrapper: TestWrapper });

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
    const hook = await renderHook(() => usePublishInputs(), { wrapper: TestWrapper });

    await expect.poll(() => newslettersApi.requests.length).toBeGreaterThan(0);
    await expect.poll(() => hook.result.current.error !== null).toBe(true);
    expect(hook.result.current.isReady).toBe(false);
    expect(window.location.pathname).toBe(pathname);
  });
});
