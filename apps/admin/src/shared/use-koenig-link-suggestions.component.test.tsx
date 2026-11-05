import { describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useQueryClient } from '@tanstack/react-query';
import { InAppProviders, fakeAdminEndpoint } from '@test-utils/acceptance';
import { searchIndexQueryKey } from './search-index';
import { useKoenigLinkSuggestions } from './use-koenig-link-suggestions';

const springSale = {
  id: 'p1',
  title: 'Sale for spring',
  url: 'https://site.test/spring/',
  status: 'published',
  visibility: 'public',
  published_at: '2026-01-05T10:00:00.000Z',
};

function fakeContent({
  posts = [springSale],
  pages = [],
}: {
  posts?: unknown[] | Response;
  pages?: unknown[] | Response;
} = {}) {
  fakeAdminEndpoint('GET', /^\/offers\//, {
    offers: [
      { name: 'Spring promo', code: '/offer/spring/', status: 'active', redemption_type: 'signup' },
      {
        name: 'Inactive promo',
        code: '/offer/inactive/',
        status: 'archived',
        redemption_type: 'signup',
      },
      {
        name: 'Retention promo',
        code: '/offer/retention/',
        status: 'active',
        redemption_type: 'retention',
      },
    ],
  });
  fakeAdminEndpoint('GET', /^\/posts\//, { posts: [springSale] });
  return {
    posts: fakeAdminEndpoint(
      'GET',
      '/search-index/posts/',
      posts instanceof Response ? posts : { posts },
    ),
    pages: fakeAdminEndpoint(
      'GET',
      '/search-index/pages/',
      pages instanceof Response ? pages : { pages },
    ),
  };
}

async function renderSuggestions(
  props: Partial<Parameters<typeof useKoenigLinkSuggestions>[0]> = {},
) {
  return await renderHook(
    () => ({
      links: useKoenigLinkSuggestions({
        siteUrl: 'https://site.test/',
        membersSignupAccess: 'all',
        donationsEnabled: false,
        recommendationsEnabled: false,
        ...props,
      }),
      queryClient: useQueryClient(),
    }),
    { wrapper: InAppProviders },
  );
}

type SuggestionsHook = Awaited<ReturnType<typeof renderSuggestions>>;

async function searchLinks(hook: SuggestionsHook, term: string) {
  let results: Awaited<ReturnType<SuggestionsHook['result']['current']['links']['searchLinks']>> =
    [];
  await hook.act(async () => {
    results = await hook.result.current.links.searchLinks(term);
  });
  return results;
}

describe('useKoenigLinkSuggestions', () => {
  it('builds autocomplete links from settings flags and active signup offers', async () => {
    fakeContent();
    const hook = await renderSuggestions({ donationsEnabled: true, recommendationsEnabled: true });

    await expect
      .poll(() => hook.result.current.links.fetchAutocompleteLinks())
      .toEqual([
        { label: 'Homepage', value: 'https://site.test/' },
        { label: 'Free signup', value: '#/portal/signup/free' },
        { label: 'Paid signup', value: '#/portal/signup' },
        { label: 'Upgrade or change plan', value: '#/portal/account/plans' },
        { label: 'Tips and donations', value: '#/portal/support' },
        { label: 'Recommendations', value: '#/portal/recommendations' },
        { label: 'Offer - Spring promo', value: 'https://site.test/offer/spring/' },
      ]);
  });

  it('places the share link immediately before Recommendations', async () => {
    fakeContent();
    const hook = await renderSuggestions({
      membersSignupAccess: 'none',
      recommendationsEnabled: true,
      includeShareLink: true,
      shareLinkLabel: 'Share page',
    });

    const links = await hook.result.current.links.fetchAutocompleteLinks();
    const shareIndex = links.findIndex((link) => link.value === '#/share');
    expect(links[shareIndex]).toEqual({ label: 'Share page', value: '#/share' });
    expect(links[shareIndex + 1]).toEqual({
      label: 'Recommendations',
      value: '#/portal/recommendations',
    });
  });

  it('offers the latest posts for a blank term', async () => {
    const index = fakeContent();
    const hook = await renderSuggestions();

    await expect
      .poll(() => searchLinks(hook, ' '))
      .toEqual([
        {
          label: 'Latest posts',
          items: [
            {
              id: 'p1',
              title: 'Sale for spring',
              url: 'https://site.test/spring/',
              visibility: 'public',
              publishedAt: '2026-01-05T10:00:00.000Z',
            },
          ],
        },
      ]);
    expect(index.posts.requests).toHaveLength(0);
  });

  it('finds linkable posts and pages whose title has every word in any order', async () => {
    fakeContent({
      posts: [
        springSale,
        { ...springSale, id: 'p2', title: 'Spring sale draft', status: 'draft' },
        { ...springSale, id: 'p3', title: 'Spring sale gone', url: 'https://site.test/404/' },
        { ...springSale, id: 'p4', title: 'Summer sale' },
      ],
      pages: [{ ...springSale, id: 'pg1', title: 'Spring sale terms', visibility: 'members' }],
    });
    const hook = await renderSuggestions();

    const groups = await searchLinks(hook, 'spring sale');

    expect(groups).toEqual([
      {
        label: 'Posts',
        items: [expect.objectContaining({ id: 'p1', title: 'Sale for spring' })],
      },
      {
        label: 'Pages',
        items: [
          expect.objectContaining({
            id: 'pg1',
            title: 'Spring sale terms',
            visibility: 'members',
            publishedAt: '2026-01-05T10:00:00.000Z',
          }),
        ],
      },
    ]);
  });

  it('downloads each search index once into the cache shared with other link pickers', async () => {
    const index = fakeContent();
    const hook = await renderSuggestions();

    await searchLinks(hook, 'spring');
    await searchLinks(hook, 'sale');

    expect(index.posts.requests).toHaveLength(1);
    expect(index.pages.requests).toHaveLength(1);
    expect(hook.result.current.queryClient.getQueryData(searchIndexQueryKey('posts'))).toEqual({
      posts: [springSale],
    });
  });

  it('leaves out a group whose index failed to download', async () => {
    fakeContent({ pages: new Response(null, { status: 500 }) });
    const hook = await renderSuggestions();

    expect((await searchLinks(hook, 'spring')).map(({ label }) => label)).toEqual(['Posts']);
  });
});
