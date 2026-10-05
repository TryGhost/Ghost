import { checkStripeEnabled, getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { getHomepageUrl } from '@tryghost/admin-x-framework/api/site';
import { useBrowseOffers } from '@tryghost/admin-x-framework/api/offers';
import { useCallback, useMemo, useRef } from 'react';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { buildAutocompleteLinks, buildOfferLinks } from '@/shared/autocomplete-links';
import {
  type Suggestion,
  type SuggestionGroup,
} from '@/settings/site/navigation/url-suggestion-input';

// Per group, so the dropdown stays short enough to scan
const CONTENT_LIMIT = 5;

type SearchIndexKey = 'pages' | 'posts';

type SearchIndexPost = {
  id: string;
  title: string;
  url: string;
  status: string;
};

// Unpublished content gets a /404/ URL (`notFoundUrl` in the server's
// lazy-url-service.ts), so it's never somewhere to link to
const isRoutable = (url?: string) => Boolean(url) && !url!.endsWith('/404/');

const toPath = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};

const matches = (suggestion: Suggestion, term: string) => {
  const needle = term.toLowerCase();
  return (
    suggestion.label.toLowerCase().includes(needle) ||
    suggestion.value.toLowerCase().includes(needle)
  );
};

const useNavigationLinkSuggestions = () => {
  const { config, settings, siteData } = useGlobalData();

  const [paidMembersEnabled = false, donationsEnabled = false, recommendationsEnabled = false] =
    getSettingValues<boolean>(settings, [
      'paid_members_enabled',
      'donations_enabled',
      'recommendations_enabled',
    ]);

  // Paid signup, plan changes, gifts and tips all go through Stripe checkout,
  // so they need Stripe connected, as in membership-settings.tsx and
  // portal-links.tsx
  const stripeEnabled = checkStripeEnabled(settings, config);

  // Offers need paid membership with Stripe, so there's nothing to fetch otherwise
  const { data: offersData } = useBrowseOffers({ enabled: paidMembersEnabled && stripeEnabled });

  const fetchApi = useFetchApi();
  const searchIndex = useRef<Partial<Record<SearchIndexKey, Promise<SearchIndexPost[]>>>>({});

  // The search-index endpoints ignore `filter` and `limit` and return
  // everything (up to 10k rows). So each index is downloaded once per modal
  // and filtered here, and searches made while it's downloading wait for the
  // same request.
  const loadIndex = useCallback(
    (key: SearchIndexKey) => {
      const cached = searchIndex.current[key];
      if (cached) {
        return cached;
      }

      const request = fetchApi<Partial<Record<SearchIndexKey, SearchIndexPost[]>>>(
        apiUrl(`/search-index/${key}/`),
      )
        .then((response) => response[key] ?? [])
        .catch((error: unknown) => {
          delete searchIndex.current[key];
          throw error;
        });
      searchIndex.current[key] = request;
      return request;
    },
    [fetchApi],
  );

  const staticGroups = useMemo<SuggestionGroup[]>(() => {
    const homepageUrl = getHomepageUrl(siteData);

    const links = buildAutocompleteLinks(
      {
        homepageUrl,
        paidMembersEnabled: paidMembersEnabled && stripeEnabled,
        donationsEnabled: donationsEnabled && stripeEnabled,
        recommendationsEnabled,
      },
      [],
    );

    const offers = (offersData?.offers || [])
      .filter((offer) => offer.status === 'active' && offer.redemption_type === 'signup')
      .slice(0, CONTENT_LIMIT);

    return [
      { label: 'Links', items: links },
      { label: 'Offers', items: buildOfferLinks(offers, homepageUrl) },
    ].map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, description: item.value })),
    }));
  }, [
    donationsEnabled,
    offersData?.offers,
    paidMembersEnabled,
    recommendationsEnabled,
    siteData,
    stripeEnabled,
  ]);

  const loadSuggestions = useCallback(
    async (term: string): Promise<SuggestionGroup[]> => {
      // A failed download only leaves out its own group
      const [pages, posts] = await Promise.all([
        loadIndex('pages').catch(() => []),
        loadIndex('posts').catch(() => []),
      ]);

      // Paths too, because people type them, and ArrowDown on a filled field
      // searches with its full URL. Not full URLs, or typing the site's
      // domain would match every post.
      const needle = term.toLowerCase();
      const pathNeedle = toPath(term).toLowerCase();
      const isMatch = (result: SearchIndexPost) =>
        result.title.toLowerCase().includes(needle) ||
        toPath(result.url).toLowerCase().includes(pathNeedle);

      const toItems = (results: SearchIndexPost[]): Suggestion[] =>
        results
          .filter((result) => result.status === 'published' && isRoutable(result.url))
          .filter((result) => !term || isMatch(result))
          .slice(0, CONTENT_LIMIT)
          .map((result) => ({
            label: result.title,
            value: result.url,
            description: toPath(result.url),
          }));

      const contentGroups: SuggestionGroup[] = [
        { label: 'Pages', items: toItems(pages) },
        { label: 'Posts', items: toItems(posts) },
      ];

      const filteredStaticGroups = term
        ? staticGroups.map((group) => ({
            ...group,
            items: group.items.filter((item) => matches(item, term)),
          }))
        : staticGroups;

      return [...filteredStaticGroups, ...contentGroups].filter((group) => group.items.length > 0);
    },
    [loadIndex, staticGroups],
  );

  return { loadSuggestions };
};

export default useNavigationLinkSuggestions;
