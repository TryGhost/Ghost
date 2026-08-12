import { checkStripeEnabled, getSettingValues } from '@tryghost/admin-x-framework/api/settings';
import { getHomepageUrl } from '@tryghost/admin-x-framework/api/site';
import { useBrowseOffers } from '@tryghost/admin-x-framework/api/offers';
import { useCallback, useMemo } from 'react';
import { useFilterableApi } from '@tryghost/admin-x-framework/hooks';
import { useGlobalData } from '@/settings/providers/global-data-context';
import {
  type Suggestion,
  type SuggestionGroup,
} from '@/settings/site/navigation/url-suggestion-input';

export type NavigationLinkSuggestion = Suggestion;
export type NavigationLinkSuggestionGroup = SuggestionGroup;

/**
 * The search-index endpoints ignore `filter` and `limit` and always return the
 * full set, which useFilterableApi then filters client side. We only ever show
 * a handful of each type so the dropdown stays scannable.
 */
const CONTENT_LIMIT = 5;

type SearchIndexPost = {
  id: string;
  title: string;
  url: string;
  status: string;
};

// Unpublished content resolves to /404/ in the URL service — never offer it
// as a destination. The fallback format is `notFoundUrl` in the server's
// lazy-url-service.ts; keep the two in sync.
const isRoutable = (url?: string) => Boolean(url) && !url!.endsWith('/404/');

/** Content rows are subtitled with their path — the full absolute URL is just noise. */
const toPath = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};

const matches = (suggestion: NavigationLinkSuggestion, term: string) => {
  const needle = term.toLowerCase();
  return (
    suggestion.label.toLowerCase().includes(needle) ||
    suggestion.value.toLowerCase().includes(needle)
  );
};

const useNavigationLinkSuggestions = () => {
  const { config, settings, siteData } = useGlobalData();

  const [paidMembersEnabled = false, donationsEnabled = false] = getSettingValues<boolean>(
    settings,
    ['paid_members_enabled', 'donations_enabled'],
  );

  // Both portal destinations below open Stripe checkout flows, so they are
  // gated the same way as the other surfaces that offer them
  // (membership-settings.tsx, portal-links.tsx)
  const stripeEnabled = checkStripeEnabled(settings, config);

  // Offers can only exist with working paid membership — skip the request
  // entirely otherwise (the modal mounts this hook whether or not a URL
  // field is ever focused)
  const { data: offersData } = useBrowseOffers({ enabled: paidMembersEnabled && stripeEnabled });

  const searchPosts = useFilterableApi<SearchIndexPost, 'posts', 'title'>({
    path: '/search-index/posts/',
    filterKey: 'title',
    responseKey: 'posts',
  });
  const searchPages = useFilterableApi<SearchIndexPost, 'pages', 'title'>({
    path: '/search-index/pages/',
    filterKey: 'title',
    responseKey: 'pages',
  });

  const staticGroups = useMemo<NavigationLinkSuggestionGroup[]>(() => {
    const membership: NavigationLinkSuggestion[] = [];

    if (paidMembersEnabled && stripeEnabled) {
      membership.push({ label: 'Gift subscriptions', value: '#/portal/gift' });
    }

    if (donationsEnabled && stripeEnabled) {
      membership.push({ label: 'Tips and donations', value: '#/portal/support' });
    }

    const offers: NavigationLinkSuggestion[] = (offersData?.offers || [])
      .filter((offer) => offer.status === 'active' && offer.redemption_type === 'signup')
      .slice(0, CONTENT_LIMIT)
      .map((offer) => ({
        label: `Offer — ${offer.name}`,
        value: new URL(offer.code, getHomepageUrl(siteData)).toString(),
      }));

    return [
      { label: 'Membership', items: membership },
      { label: 'Offers', items: offers },
    ].map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, description: item.value })),
    }));
  }, [donationsEnabled, offersData?.offers, paidMembersEnabled, siteData, stripeEnabled]);

  const loadSuggestions = useCallback(
    async (term: string): Promise<NavigationLinkSuggestionGroup[]> => {
      // Always fetch with an empty term: the endpoints serve the full index
      // regardless, and useFilterableApi only caches (`allLoaded`) after an
      // empty-term fetch — so this makes every call after the first one free.
      // Each source degrades independently: one failing search shouldn't take
      // the membership and offer groups down with it.
      const [pages, posts] = await Promise.all([
        searchPages.loadData('').catch(() => []),
        searchPosts.loadData('').catch(() => []),
      ]);

      const needle = term.toLowerCase();
      const toItems = (results: SearchIndexPost[]): NavigationLinkSuggestion[] =>
        results
          .filter((result) => result.status === 'published' && isRoutable(result.url))
          .filter((result) => !term || result.title.toLowerCase().includes(needle))
          .slice(0, CONTENT_LIMIT)
          .map((result) => ({
            label: result.title,
            value: result.url,
            description: toPath(result.url),
          }));

      const contentGroups: NavigationLinkSuggestionGroup[] = [
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
    [searchPages, searchPosts, staticGroups],
  );

  return { loadSuggestions };
};

export default useNavigationLinkSuggestions;
