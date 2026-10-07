import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderHook } from 'vitest-browser-react';
import { useQueryClient } from '@tanstack/react-query';
import { postsDataType } from '@tryghost/admin-x-framework/api/posts';
import { type User, useEditUser } from '@tryghost/admin-x-framework/api/users';
import type { StaffRoleName } from '@tryghost/test-data';

import {
  InAppProviders,
  configResponse,
  currentUserResponse,
  fakeAdminEndpoint,
  settingsResponse,
  staffRole,
} from '@test-utils/acceptance';

import { useGlobalSearch } from '@/global-search/use-global-search';

type IndexKey = 'posts' | 'pages' | 'tags' | 'users';

const DEBOUNCE_ELAPSED_MS = 300;

const billingSearch = {
  groupName: 'Acme Hosting',
  items: [{ id: 'change-plan', title: 'Change plan', path: '/plans', keywords: 'billing' }],
};

function deferred() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function fakeSession({
  locale = 'en',
  role = 'Owner',
  hostSettings,
  currentUserReady,
}: {
  locale?: string;
  role?: StaffRoleName;
  hostSettings?: Record<string, unknown>;
  currentUserReady?: Promise<void>;
} = {}) {
  const config = configResponse();
  config.config.hostSettings = hostSettings;
  fakeAdminEndpoint('GET', /^\/config\/(?:\?.*)?$/, config);
  fakeAdminEndpoint('GET', /^\/settings\/\?/, settingsResponse({ settings: { locale } }));

  const me = currentUserResponse();
  me.users[0].roles = [staffRole({ name: role })];
  fakeAdminEndpoint('GET', /^\/users\/me\/\?include=roles$/, async () => {
    await currentUserReady;
    return me;
  });
}

function fakeSearchIndex(
  lists: Partial<Record<IndexKey, () => unknown[] | Promise<unknown[]>>> = {},
) {
  const defaults: Record<IndexKey, () => unknown[]> = {
    posts: () => [
      { id: 'p1', title: 'First post', status: 'published', url: 'https://site.test/p/' },
    ],
    pages: () => [{ id: 'g1', title: 'First page', status: 'draft' }],
    tags: () => [{ id: 't1', slug: 'first-tag', name: 'First tag' }],
    users: () => [{ id: 'u1', slug: 'first-user', name: 'First user' }],
  };

  const endpoint = (key: IndexKey) => {
    const list = lists[key] ?? defaults[key];
    return fakeAdminEndpoint('GET', `/search-index/${key}/`, async () => ({
      [key]: await list(),
    }));
  };

  return {
    posts: endpoint('posts'),
    pages: endpoint('pages'),
    tags: endpoint('tags'),
    users: endpoint('users'),
  };
}

async function renderSearch(term = '') {
  return await renderHook(
    (props?: { term: string }) => ({
      search: useGlobalSearch(props?.term ?? ''),
      queryClient: useQueryClient(),
      editUser: useEditUser(),
    }),
    { wrapper: InAppProviders, initialProps: { term } },
  );
}

type SearchHook = Awaited<ReturnType<typeof renderSearch>>;

const groupNames = (hook: SearchHook) =>
  hook.result.current.search.results.map((group) => group.groupName);

async function settledGroupNames(hook: SearchHook) {
  await expect.poll(() => hook.result.current.search.isLoading).toBe(false);
  return groupNames(hook);
}

describe('useGlobalSearch', () => {
  it('loads the index only once a term is typed', async () => {
    fakeSession();
    const index = fakeSearchIndex();
    const hook = await renderSearch();

    await expect.poll(() => hook.result.current.queryClient.isFetching()).toBe(0);
    expect(index.posts.requests).toHaveLength(0);
    expect(hook.result.current.search.isLoading).toBe(false);

    await hook.rerender({ term: 'first' });

    expect(await settledGroupNames(hook)).toEqual(['Staff', 'Tags', 'Posts', 'Pages']);
    expect(index.posts.requests).toHaveLength(1);
  });

  it('keeps the previous results while the next term is debounced, then reuses the index', async () => {
    fakeSession();
    const index = fakeSearchIndex();
    const hook = await renderSearch('first');
    expect(await settledGroupNames(hook)).toHaveLength(4);

    await hook.rerender({ term: 'tag' });

    expect(groupNames(hook)).toHaveLength(4);
    expect(hook.result.current.search.isLoading).toBe(true);
    expect(await settledGroupNames(hook)).toEqual(['Tags']);
    expect(index.posts.requests).toHaveLength(1);
    expect(index.tags.requests).toHaveLength(1);
  });

  it('returns nothing as soon as the term is cleared', async () => {
    fakeSession();
    fakeSearchIndex();
    const hook = await renderSearch('first');
    expect(await settledGroupNames(hook)).toHaveLength(4);

    await hook.rerender({ term: '' });

    expect(groupNames(hook)).toEqual([]);
    expect(hook.result.current.search.isLoading).toBe(false);
  });

  it('reloads a list after its resource is invalidated', async () => {
    fakeSession();
    let posts = [{ id: 'p1', title: 'First post', status: 'published' }];
    const index = fakeSearchIndex({ posts: () => posts });
    const hook = await renderSearch('renamed');
    expect(await settledGroupNames(hook)).toEqual([]);

    posts = [{ id: 'p1', title: 'Renamed post', status: 'published' }];
    await hook.result.current.queryClient.invalidateQueries({ queryKey: [postsDataType] });

    expect(await settledGroupNames(hook)).toEqual(['Posts']);
    expect(index.posts.requests).toHaveLength(2);
    expect(index.tags.requests).toHaveLength(1);
  });

  it('waits for a list invalidated while idle to reload before searching it', async () => {
    fakeSession();
    const reload = deferred();
    let deleted = false;
    const index = fakeSearchIndex({
      posts: async () => {
        if (!deleted) {
          return [{ id: 'p1', title: 'First post', status: 'published' }];
        }
        await reload.promise;
        return [];
      },
    });
    const hook = await renderSearch('first');
    expect(await settledGroupNames(hook)).toContain('Posts');
    await hook.rerender({ term: '' });

    deleted = true;
    await hook.result.current.queryClient.invalidateQueries({
      queryKey: [postsDataType],
      refetchType: 'none',
    });
    await hook.rerender({ term: 'first' });
    await expect.poll(() => index.posts.requests.length).toBe(2);
    await wait(DEBOUNCE_ELAPSED_MS);

    expect(hook.result.current.search.isLoading).toBe(true);
    expect(groupNames(hook)).toEqual([]);

    reload.release();

    expect(await settledGroupNames(hook)).toEqual(['Staff', 'Tags', 'Pages']);
  });

  it('applies a staff edit made in React without reloading the list', async () => {
    fakeSession();
    const index = fakeSearchIndex();
    const renamed = { ...currentUserResponse().users[0], id: 'u1', name: 'Renamed user' };
    fakeAdminEndpoint('PUT', '/users/u1/?include=roles', { users: [renamed] });
    const hook = await renderSearch('renamed');
    expect(await settledGroupNames(hook)).toEqual([]);

    await hook.result.current.editUser.mutateAsync(renamed as unknown as User);

    await expect.poll(() => groupNames(hook)).toEqual(['Staff']);
    expect(index.users.requests).toHaveLength(1);
  });

  it('reports a list that fails to load and keeps searching the others', async () => {
    fakeSession();
    fakeSearchIndex();
    fakeAdminEndpoint(
      'GET',
      '/search-index/posts/',
      { errors: [{ message: 'Posts are offline' }] },
      { status: 500 },
    );
    const hook = await renderSearch('first');

    expect(await settledGroupNames(hook)).toEqual(['Staff', 'Tags', 'Pages']);
    await expect.element(page.getByText('Posts are offline')).toBeVisible();
  });

  it('waits for the current user before showing results', async () => {
    const currentUser = deferred();
    fakeSession({
      hostSettings: { billing: { enabled: true, search: billingSearch } },
      currentUserReady: currentUser.promise,
    });
    const index = fakeSearchIndex();
    const hook = await renderSearch('plan');
    await expect.poll(() => index.tags.requests.length).toBe(1);
    await wait(DEBOUNCE_ELAPSED_MS);

    expect(hook.result.current.search.isLoading).toBe(true);
    expect(groupNames(hook)).toEqual([]);

    currentUser.release();

    expect(await settledGroupNames(hook)).toEqual(['Acme Hosting']);
  });

  it('matches inside words for a non-English site', async () => {
    fakeSession({ locale: 'de' });
    fakeSearchIndex();
    const hook = await renderSearch('irst pos');

    expect(await settledGroupNames(hook)).toEqual(['Posts']);
  });

  describe('billing results', () => {
    const billingEnabled = { billing: { enabled: true, search: billingSearch } };

    it('shows them to the owner when billing is enabled', async () => {
      fakeSession({ hostSettings: billingEnabled });
      fakeSearchIndex();
      const hook = await renderSearch('plan');

      expect(await settledGroupNames(hook)).toEqual(['Acme Hosting']);
    });

    it('hides them from other staff', async () => {
      fakeSession({ role: 'Administrator', hostSettings: billingEnabled });
      fakeSearchIndex();
      const hook = await renderSearch('plan');

      expect(await settledGroupNames(hook)).toEqual([]);
    });

    it('hides them when billing is not enabled', async () => {
      fakeSession({ hostSettings: { billing: { search: billingSearch } } });
      fakeSearchIndex();
      const hook = await renderSearch('plan');

      expect(await settledGroupNames(hook)).toEqual([]);
    });

    it('shows them to any staff while the site must upgrade, even with billing off', async () => {
      fakeSession({
        role: 'Administrator',
        hostSettings: { billing: { search: billingSearch }, forceUpgrade: true },
      });
      fakeSearchIndex();
      const hook = await renderSearch('plan');

      expect(await settledGroupNames(hook)).toEqual(['Acme Hosting']);
    });
  });
});
