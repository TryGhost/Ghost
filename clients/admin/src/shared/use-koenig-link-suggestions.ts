import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBrowseOffers } from '@tryghost/admin-x-framework/api/offers';
import { useBrowsePosts } from '@tryghost/admin-x-framework/api/posts';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { isLinkablePost, matchesWords } from '@/shared/link-search';
import { type SearchIndexItem, searchIndexQueryOptions } from '@/shared/search-index';

type LinkItem = {
  id: string;
  title: string;
  url: string;
  visibility?: string;
  publishedAt?: string;
};

type LinkGroup = {
  label: string;
  items: LinkItem[];
};

interface UseKoenigLinkSuggestionsProps {
  siteUrl: string;
  membersSignupAccess: string;
  donationsEnabled: boolean;
  recommendationsEnabled: boolean;
  includeShareLink?: boolean;
  shareLinkLabel?: string;
}

export const useKoenigLinkSuggestions = ({
  siteUrl,
  membersSignupAccess,
  donationsEnabled,
  recommendationsEnabled,
  includeShareLink = false,
  shareLinkLabel = 'Share',
}: UseKoenigLinkSuggestionsProps) => {
  const { data: offersData } = useBrowseOffers();
  const { data: latestPostsData } = useBrowsePosts({
    searchParams: {
      filter: 'status:published',
      fields: 'id,url,title,visibility,published_at',
      order: 'published_at desc',
      limit: '5',
    },
  });
  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();

  // Shared with global search and the other link pickers. A failed download
  // only leaves out its own group.
  const loadIndex = useCallback(
    async (key: 'posts' | 'pages'): Promise<SearchIndexItem[]> => {
      try {
        const response = await queryClient.fetchQuery(searchIndexQueryOptions(key, fetchApi));
        return response[key] ?? [];
      } catch {
        return [];
      }
    },
    [fetchApi, queryClient],
  );

  const defaultLinks = useMemo<LinkGroup[]>(() => {
    const posts = latestPostsData?.posts || [];
    const latestPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      url: post.url,
      visibility: post.visibility,
      publishedAt: post.published_at ?? undefined,
    }));

    return [
      {
        label: 'Latest posts',
        items: latestPosts,
      },
    ];
  }, [latestPostsData?.posts]);

  const fetchAutocompleteLinks = useCallback(() => {
    const defaults = [
      { label: 'Homepage', value: siteUrl },
      { label: 'Free signup', value: '#/portal/signup/free' },
    ];

    const shareLink = includeShareLink ? [{ label: shareLinkLabel, value: '#/share' }] : [];

    const memberLinks =
      membersSignupAccess === 'all'
        ? [
            { label: 'Paid signup', value: '#/portal/signup' },
            { label: 'Upgrade or change plan', value: '#/portal/account/plans' },
          ]
        : [];

    const donationLink = donationsEnabled
      ? [{ label: 'Tips and donations', value: '#/portal/support' }]
      : [];
    const recommendationLink = recommendationsEnabled
      ? [{ label: 'Recommendations', value: '#/portal/recommendations' }]
      : [];
    const offersLinks = (offersData?.offers || [])
      .filter((offer) => offer.status === 'active' && offer.redemption_type === 'signup')
      .map((offer) => ({
        label: `Offer - ${offer.name}`,
        value: new URL(offer.code, siteUrl).toString(),
      }));

    return Promise.resolve([
      ...defaults,
      ...memberLinks,
      ...donationLink,
      ...shareLink,
      ...recommendationLink,
      ...offersLinks,
    ]);
  }, [
    donationsEnabled,
    includeShareLink,
    membersSignupAccess,
    offersData?.offers,
    recommendationsEnabled,
    shareLinkLabel,
    siteUrl,
  ]);

  const searchLinks = useCallback(
    async (term?: string) => {
      if (!term?.trim()) {
        return defaultLinks;
      }

      const [posts, pages] = await Promise.all([loadIndex('posts'), loadIndex('pages')]);

      const toItems = (entries: SearchIndexItem[]): LinkItem[] =>
        entries
          .filter(isLinkablePost)
          .filter((entry) => matchesWords(entry.title ?? '', term))
          .map((entry) => ({
            id: entry.id,
            title: entry.title ?? '',
            url: entry.url,
            visibility: entry.visibility,
            publishedAt: entry.published_at ?? undefined,
          }));

      return [
        { label: 'Posts', items: toItems(posts) },
        { label: 'Pages', items: toItems(pages) },
      ].filter((group) => group.items.length > 0);
    },
    [defaultLinks, loadIndex],
  );

  return {
    fetchAutocompleteLinks,
    searchLinks,
  };
};
