import {useBrowseOffers} from '../api/offers';
import {useBrowsePosts} from '../api/posts';
import {useCallback, useMemo} from 'react';
import useFilterableApi from './use-filterable-api';

type SearchIndexResult = {
    id: string;
    title: string;
    url: string;
    status: string;
    visibility?: string;
    published_at?: string;
};

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
}

export const useKoenigLinkSuggestions = ({
    siteUrl,
    membersSignupAccess,
    donationsEnabled,
    recommendationsEnabled
}: UseKoenigLinkSuggestionsProps) => {
    const {data: offersData} = useBrowseOffers();
    const {data: latestPostsData} = useBrowsePosts({
        searchParams: {
            filter: 'status:published',
            fields: 'id,url,title,visibility,published_at',
            order: 'published_at desc',
            limit: '5'
        }
    });
    const searchPosts = useFilterableApi<SearchIndexResult, 'posts', 'title'>({
        path: '/search-index/posts/',
        filterKey: 'title',
        responseKey: 'posts'
    });
    const searchPages = useFilterableApi<SearchIndexResult, 'pages', 'title'>({
        path: '/search-index/pages/',
        filterKey: 'title',
        responseKey: 'pages'
    });

    const defaultLinks = useMemo<LinkGroup[]>(() => {
        const posts = latestPostsData?.posts || [];
        const latestPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            url: post.url,
            visibility: post.visibility,
            publishedAt: post.published_at
        }));

        return [{
            label: 'Latest posts',
            items: latestPosts
        }];
    }, [latestPostsData?.posts]);

    const fetchAutocompleteLinks = useCallback(async () => {
        const defaults = [
            {label: 'Homepage', value: siteUrl},
            {label: 'Free signup', value: '#/portal/signup/free'}
        ];

        const memberLinks = membersSignupAccess === 'all' ? [
            {label: 'Paid signup', value: '#/portal/signup'},
            {label: 'Upgrade or change plan', value: '#/portal/account/plans'}
        ] : [];

        const donationLink = donationsEnabled ? [{label: 'Tips and donations', value: '#/portal/support'}] : [];
        const recommendationLink = recommendationsEnabled ? [{label: 'Recommendations', value: '#/portal/recommendations'}] : [];
        const offersLinks = (offersData?.offers || [])
            .filter(offer => offer.status === 'active' && offer.redemption_type === 'signup')
            .map(offer => ({
                label: `Offer - ${offer.name}`,
                value: new URL(offer.code, siteUrl).toString()
            }));

        return [...defaults, ...memberLinks, ...donationLink, ...recommendationLink, ...offersLinks];
    }, [donationsEnabled, membersSignupAccess, offersData?.offers, recommendationsEnabled, siteUrl]);

    const searchLinks = useCallback(async (term: string) => {
        if (!term) {
            return defaultLinks;
        }

        const [posts, pages] = await Promise.all([
            searchPosts.loadData(term),
            searchPages.loadData(term)
        ]);

        return [
            {
                label: 'Posts',
                items: posts
                    .filter(item => item.status === 'published')
                    .map(item => ({
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        visibility: item.visibility,
                        publishedAt: item.published_at
                    }))
            },
            {
                label: 'Pages',
                items: pages
                    .filter(item => item.status === 'published')
                    .map(item => ({
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        visibility: item.visibility,
                        publishedAt: item.published_at
                    }))
            }
        ].filter(group => group.items.length > 0);
    }, [defaultLinks, searchPages, searchPosts]);

    return {
        fetchAutocompleteLinks,
        searchLinks
    };
};
