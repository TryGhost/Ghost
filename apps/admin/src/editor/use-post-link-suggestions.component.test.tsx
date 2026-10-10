import { describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useQueryClient } from '@tanstack/react-query';
import { usersDataType } from '@tryghost/admin-x-framework/api/current-user';
import { useDeleteUser, useEditUser } from '@tryghost/admin-x-framework/api/users';
import { InAppProviders, fakeAdminEndpoint, staffUser } from '@test-utils/acceptance';
import { useGlobalSearch } from '@/global-search/use-global-search';
import { usePostLinkSuggestions } from './use-post-link-suggestions';
import type { LinkSearchGroup } from './link-suggestions';

const jamie = () =>
  staffUser({
    id: 'u1',
    name: 'Jamie Larson',
    slug: 'team-jamie',
    url: 'https://site.test/author/team-jamie/',
  });

function fakeIndexes(users: unknown[] = [jamie()]) {
  return {
    users: fakeAdminEndpoint('GET', '/search-index/users/', { users }),
    tags: fakeAdminEndpoint('GET', '/search-index/tags/', { tags: [] }),
    posts: fakeAdminEndpoint('GET', '/search-index/posts/', {
      posts: [
        {
          id: 'p1',
          title: 'Jamie interview',
          status: 'published',
          url: 'https://site.test/interview/',
          visibility: 'members',
          published_at: '2026-01-05T10:00:00.000Z',
        },
      ],
    }),
    pages: fakeAdminEndpoint('GET', '/search-index/pages/', { pages: [] }),
  };
}

async function renderSuggestions(term = '') {
  return await renderHook(
    (props?: { term: string }) => ({
      links: usePostLinkSuggestions({
        postType: 'post',
        homepageUrl: 'https://site.test/',
        paidMembersEnabled: true,
        donationsEnabled: false,
        recommendationsEnabled: false,
        membersEnabled: true,
        timezone: 'Etc/UTC',
      }),
      search: useGlobalSearch(props?.term ?? ''),
      editUser: useEditUser(),
      deleteUser: useDeleteUser(),
      queryClient: useQueryClient(),
    }),
    { wrapper: InAppProviders, initialProps: { term } },
  );
}

type SuggestionsHook = Awaited<ReturnType<typeof renderSuggestions>>;

async function searchLinks(hook: SuggestionsHook, term = 'jamie') {
  let results: LinkSearchGroup[] = [];
  await hook.act(async () => {
    results = await hook.result.current.links.searchLinks(term);
  });
  return results;
}

const staffLinks = (groups: LinkSearchGroup[]) =>
  groups.find(({ label }) => label === 'Staff')?.items ?? [];
const staffResults = (hook: SuggestionsHook) =>
  hook.result.current.search.results.find(({ heading }) => heading === 'Staff')?.items ?? [];

describe('usePostLinkSuggestions', () => {
  it.each(['global search', 'editor links'] as const)(
    'shares the index when %s loads it first, retaining link metadata',
    async (first) => {
      const index = fakeIndexes();
      const hook = await renderSuggestions(first === 'global search' ? 'jamie' : '');

      if (first === 'global search') {
        await expect.poll(() => hook.result.current.search.isLoading).toBe(false);
      } else {
        expect(index.users.requests).toHaveLength(0);
      }

      const links = await searchLinks(hook);
      expect(staffLinks(links)).toEqual([
        { id: 'user.u1', title: 'Jamie Larson', url: jamie().url },
      ]);
      expect(links.find(({ label }) => label === 'Posts')?.items[0]).toMatchObject({
        url: 'https://site.test/interview/',
        metaText: '5 Jan 2026',
        metaIconTitle: 'Members only',
      });

      await hook.rerender({ term: 'jamie' });
      await expect.poll(() => hook.result.current.search.isLoading).toBe(false);
      expect(staffResults(hook)).toMatchObject([{ id: 'team-jamie', title: 'Jamie Larson' }]);
      await searchLinks(hook, 'interview');
      for (const endpoint of Object.values(index)) {
        expect(endpoint.requests).toHaveLength(1);
      }
    },
  );

  it.each([
    ['slug', { slug: 'jamie-larson', url: 'https://site.test/author/jamie-larson/' }],
    ['name', { name: 'Jamie L. Larson' }],
    ['URL', { url: 'https://site.test/writers/team-jamie/' }],
    ['preferences', { accessibility: '{"nightShift":true}' }],
  ])('uses the saved staff %s in both searches without refetching', async (_field, changes) => {
    const index = fakeIndexes();
    const saved = { ...jamie(), ...changes };
    fakeAdminEndpoint('PUT', '/users/u1/?include=roles', { users: [saved] });
    const hook = await renderSuggestions('jamie');
    await expect.poll(() => hook.result.current.search.isLoading).toBe(false);
    expect(staffLinks(await searchLinks(hook))[0].url).toBe(jamie().url);

    await hook.act(() => hook.result.current.editUser.mutateAsync(saved));

    expect(staffLinks(await searchLinks(hook))).toEqual([
      { id: 'user.u1', title: saved.name, url: saved.url },
    ]);
    await expect
      .poll(() => staffResults(hook))
      .toMatchObject([{ id: saved.slug, title: saved.name }]);
    for (const endpoint of Object.values(index)) {
      expect(endpoint.requests).toHaveLength(1);
    }
  });

  it('uses the server-normalized slug and URL rather than the submitted values', async () => {
    fakeIndexes();
    const saved = {
      ...jamie(),
      slug: 'jamie-larson-2',
      url: 'https://site.test/author/jamie-larson-2/',
    };
    fakeAdminEndpoint('PUT', '/users/u1/?include=roles', { users: [saved] });
    const hook = await renderSuggestions();
    await searchLinks(hook);

    await hook.act(() =>
      hook.result.current.editUser.mutateAsync({ ...jamie(), slug: 'Jamie Larson' }),
    );

    expect(staffLinks(await searchLinks(hook))[0].url).toBe(saved.url);
  });

  it('removes a deleted staff user from links and global search', async () => {
    const index = fakeIndexes();
    fakeAdminEndpoint('DELETE', '/users/u1/', new Response(null, { status: 204 }));
    const hook = await renderSuggestions('jamie');
    await expect.poll(() => hook.result.current.search.isLoading).toBe(false);
    expect(staffLinks(await searchLinks(hook))).toHaveLength(1);

    await hook.act(() => hook.result.current.deleteUser.mutateAsync('u1'));

    expect(staffLinks(await searchLinks(hook))).toEqual([]);
    await expect.poll(() => staffResults(hook)).toEqual([]);
    expect(index.users.requests).toHaveLength(1);
  });

  it('waits for an invalidated index instead of returning a cached author URL', async () => {
    fakeIndexes();
    const hook = await renderSuggestions();
    await searchLinks(hook);
    let release = () => {};
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    const updated = { ...jamie(), url: 'https://site.test/author/jamie-larson/' };
    const reload = fakeAdminEndpoint('GET', '/search-index/users/', async () => {
      await ready;
      return { users: [updated] };
    });
    await hook.result.current.queryClient.invalidateQueries({
      queryKey: [usersDataType],
      refetchType: 'none',
    });

    let settled = false;
    const links = hook.result.current.links.searchLinks('jamie').then((result) => {
      settled = true;
      return result;
    });
    try {
      await expect.poll(() => reload.requests.length).toBe(1);
      expect(settled).toBe(false);
    } finally {
      release();
    }

    expect(staffLinks(await links)[0].url).toBe(updated.url);
  });

  it('retries a failed staff read without leaving the editor on session expiry', async () => {
    const { pathname } = window.location;
    fakeIndexes();
    fakeAdminEndpoint(
      'GET',
      '/search-index/users/',
      { errors: [{ type: 'UnauthorizedError', message: 'Authorization failed' }] },
      { status: 401 },
    );
    const hook = await renderSuggestions();

    expect(staffLinks(await searchLinks(hook))).toEqual([]);
    expect(window.location.pathname).toBe(pathname);
    fakeAdminEndpoint('GET', '/search-index/users/', { users: [jamie()] });

    expect(staffLinks(await searchLinks(hook))).toHaveLength(1);
  });
});
