import { checkStripeEnabled, getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { getHomepageUrl } from '@tryghost/admin-x-framework/api/site';
import { useBrowseOffers } from '@tryghost/admin-x-framework/api/offers';
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchApi } from '@tryghost/admin-x-framework/hooks';
import { useGlobalData } from '@/settings/providers/global-data-context';
import { buildAutocompleteLinks, buildOfferLinks } from '@/shared/autocomplete-links';
import { isLinkablePost, matchesWords } from '@/shared/link-search';
import { type SearchIndexItem, searchIndexQueryOptions } from '@/shared/search-index';
import {
  type Suggestion,
  type SuggestionGroup,
} from '@/settings/site/navigation/url-suggestion-input';

// Per group, so the dropdown stays short enough to scan
const CONTENT_LIMIT = 5;

const toPath = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};

const matches = (suggestion: Suggestion, term: string) =>
  matchesWords(suggestion.label, term) || matchesWords(suggestion.value, term);

const useNavigationLinkSuggestions = () => {
  const { config, settings, siteData } = useGlobalData();

  const [paidMembersEnabled = false, donationsEnabled = false, recommendationsEnabled = false] =
    getSettingValues<boolean>(settings, [
      'paid_members_enabled',
      'donations_enabled',
      'recommendations_enabled',
    ]);
  const [membersSignupAccess = 'all'] = getSettingValues<string>(settings, [
    'members_signup_access',
  ]);

  // Paid signup, plan changes, gifts and tips all go through Stripe checkout,
  // so they need Stripe connected, as in membership-settings.tsx and
  // portal-links.tsx
  const stripeEnabled = checkStripeEnabled(settings, config);

  // Offers need paid membership with Stripe, so there's nothing to fetch otherwise
  const { data: offersData } = useBrowseOffers({
    enabled: paidMembersEnabled && stripeEnabled,
  });

  const fetchApi = useFetchApi();
  const queryClient = useQueryClient();

  // The search-index endpoints ignore `filter` and `limit` and return
  // everything (up to 10k rows), so the lists are shared with global search
  // and the editor and filtered here
  const loadIndex = useCallback(
    async (key: 'pages' | 'posts'): Promise<SearchIndexItem[]> => {
      const response = await queryClient.fetchQuery(searchIndexQueryOptions(key, fetchApi));
      return response[key] ?? [];
    },
    [fetchApi, queryClient],
  );

  const staticGroups = useMemo<SuggestionGroup[]>(() => {
    const homepageUrl = getHomepageUrl(siteData);

    const links = buildAutocompleteLinks(
      {
        homepageUrl,
        paidMembersEnabled: paidMembersEnabled && stripeEnabled,
        donationsEnabled: donationsEnabled && stripeEnabled,
        recommendationsEnabled,
        membersSignupAccess,
      },
      [],
    );

    // Keep every active signup offer here; the five-result cap is applied
    // after search, so typing still finds offers past the first five
    const offers = (offersData?.offers || []).filter(
      (offer) => offer.status === 'active' && offer.redemption_type === 'signup',
    );

    return [
      { label: 'Links', items: links },
      { label: 'Offers', items: buildOfferLinks(offers, homepageUrl) },
    ].map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, description: item.value })),
    }));
  }, [
    donationsEnabled,
    membersSignupAccess,
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
      const pathTerm = toPath(term);

      const toItems = (results: SearchIndexItem[]): Suggestion[] =>
        results
          .filter(isLinkablePost)
          .filter(
            (result) =>
              matchesWords(result.title ?? '', term) || matchesWords(toPath(result.url), pathTerm),
          )
          .slice(0, CONTENT_LIMIT)
          .map((result) => ({
            label: result.title ?? '',
            value: result.url,
            description: toPath(result.url),
          }));

      const contentGroups: SuggestionGroup[] = [
        { label: 'Pages', items: toItems(pages) },
        { label: 'Posts', items: toItems(posts) },
      ];

      const filteredStaticGroups = staticGroups.map((group) => {
        const items = term ? group.items.filter((item) => matches(item, term)) : group.items;
        return {
          ...group,
          // Offers only: Links are few enough to show in full
          items: group.label === 'Offers' ? items.slice(0, CONTENT_LIMIT) : items,
        };
      });

      return [...filteredStaticGroups, ...contentGroups].filter((group) => group.items.length > 0);
    },
    [loadIndex, staticGroups],
  );

  return { loadSuggestions };
};

export default useNavigationLinkSuggestions;
