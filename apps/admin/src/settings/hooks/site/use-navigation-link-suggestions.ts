import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useCallback, useMemo} from 'react';
import {useFilterableApi} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '@/settings/providers/global-data-context';

export type NavigationLinkSuggestion = {
    /** Human readable name, e.g. "Tips and donations" or a post title */
    label: string;
    /** The value written into the URL field when picked */
    value: string;
    /** Secondary line under the label — the URL for portal links, the path for content */
    description?: string;
};

export type NavigationLinkSuggestionGroup = {
    label: string;
    items: NavigationLinkSuggestion[];
};

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
// as a destination.
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
    return suggestion.label.toLowerCase().includes(needle) || suggestion.value.toLowerCase().includes(needle);
};

const useNavigationLinkSuggestions = () => {
    const {settings, siteData} = useGlobalData();
    const {data: offersData} = useBrowseOffers();

    const [
        membersSignupAccess,
        donationsEnabled = false
    ] = getSettingValues(settings, [
        'members_signup_access',
        'donations_enabled'
    ]);

    const paidMembersEnabled = membersSignupAccess === 'all';

    const searchPosts = useFilterableApi<SearchIndexPost, 'posts', 'title'>({
        path: '/search-index/posts/',
        filterKey: 'title',
        responseKey: 'posts'
    });
    const searchPages = useFilterableApi<SearchIndexPost, 'pages', 'title'>({
        path: '/search-index/pages/',
        filterKey: 'title',
        responseKey: 'pages'
    });

    const staticGroups = useMemo<NavigationLinkSuggestionGroup[]>(() => {
        const membership: NavigationLinkSuggestion[] = [];

        if (paidMembersEnabled) {
            membership.push({label: 'Gift subscriptions', value: '#/portal/gift'});
        }

        if (donationsEnabled) {
            membership.push({label: 'Tips and donations', value: '#/portal/support'});
        }

        const offers: NavigationLinkSuggestion[] = (offersData?.offers || [])
            .filter(offer => offer.status === 'active' && offer.redemption_type === 'signup')
            .map(offer => ({
                label: `Offer — ${offer.name}`,
                value: new URL(offer.code, siteData.url).toString()
            }));

        return [
            {label: 'Membership', items: membership},
            {label: 'Offers', items: offers}
        ].map(group => ({
            ...group,
            items: group.items.map(item => ({...item, description: item.value}))
        }));
    }, [donationsEnabled, offersData?.offers, paidMembersEnabled, siteData.url]);

    const loadSuggestions = useCallback(async (term: string): Promise<NavigationLinkSuggestionGroup[]> => {
        const [pages, posts] = await Promise.all([
            searchPages.loadData(term),
            searchPosts.loadData(term)
        ]);

        const contentGroups: NavigationLinkSuggestionGroup[] = [
            {
                label: 'Pages',
                items: pages
                    .filter(page => page.status === 'published' && isRoutable(page.url))
                    .slice(0, CONTENT_LIMIT)
                    .map(page => ({label: page.title, value: page.url, description: toPath(page.url)}))
            },
            {
                label: 'Posts',
                items: posts
                    .filter(post => post.status === 'published' && isRoutable(post.url))
                    .slice(0, CONTENT_LIMIT)
                    .map(post => ({label: post.title, value: post.url, description: toPath(post.url)}))
            }
        ];

        const filteredStaticGroups = term
            ? staticGroups.map(group => ({...group, items: group.items.filter(item => matches(item, term))}))
            : staticGroups;

        return [...filteredStaticGroups, ...contentGroups].filter(group => group.items.length > 0);
    }, [searchPages, searchPosts, staticGroups]);

    return {loadSuggestions};
};

export default useNavigationLinkSuggestions;
