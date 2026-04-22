import type {MockedFunction} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useKoenigLinkSuggestions} from '../../../src/hooks/use-koenig-link-suggestions';

vi.mock('../../../src/api/offers', () => ({
    useBrowseOffers: vi.fn()
}));

vi.mock('../../../src/api/posts', () => ({
    useBrowsePosts: vi.fn()
}));

vi.mock('../../../src/hooks/use-filterable-api', () => ({
    default: vi.fn()
}));

import * as offersModule from '../../../src/api/offers';
import * as postsModule from '../../../src/api/posts';
import useFilterableApi from '../../../src/hooks/use-filterable-api';

describe('useKoenigLinkSuggestions', () => {
    let mockUseBrowseOffers: MockedFunction<typeof offersModule.useBrowseOffers>;
    let mockUseBrowsePosts: MockedFunction<typeof postsModule.useBrowsePosts>;
    let mockUseFilterableApi: MockedFunction<typeof useFilterableApi>;

    beforeEach(() => {
        mockUseBrowseOffers = vi.mocked(offersModule.useBrowseOffers);
        mockUseBrowsePosts = vi.mocked(postsModule.useBrowsePosts);
        mockUseFilterableApi = vi.mocked(useFilterableApi);
    });

    afterEach(() => {
        mockUseBrowseOffers.mockReset();
        mockUseBrowsePosts.mockReset();
        mockUseFilterableApi.mockReset();
    });

    it('builds autocomplete links from settings flags and active signup offers', async () => {
        mockUseBrowseOffers.mockReturnValue({
            data: {
                offers: [
                    {name: 'Spring promo', code: '/offer/spring/', status: 'active', redemption_type: 'signup'},
                    {name: 'Inactive promo', code: '/offer/inactive/', status: 'archived', redemption_type: 'signup'},
                    {name: 'Retention promo', code: '/offer/retention/', status: 'active', redemption_type: 'retention'}
                ]
            }
        } as any);
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: []},
            refetch: vi.fn()
        } as any);
        mockUseFilterableApi
            .mockReturnValueOnce({loadData: vi.fn().mockResolvedValue([])} as any)
            .mockReturnValueOnce({loadData: vi.fn().mockResolvedValue([])} as any);

        const {result} = renderHook(() => useKoenigLinkSuggestions({
            siteUrl: 'https://example.com/',
            membersSignupAccess: 'all',
            donationsEnabled: true,
            recommendationsEnabled: true
        }));

        const links = await result.current.fetchAutocompleteLinks();

        expect(links).toEqual([
            {label: 'Homepage', value: 'https://example.com/'},
            {label: 'Free signup', value: '#/portal/signup/free'},
            {label: 'Paid signup', value: '#/portal/signup'},
            {label: 'Upgrade or change plan', value: '#/portal/account/plans'},
            {label: 'Tips and donations', value: '#/portal/support'},
            {label: 'Recommendations', value: '#/portal/recommendations'},
            {label: 'Offer - Spring promo', value: 'https://example.com/offer/spring/'}
        ]);
    });

    it('returns cached latest posts links for empty search term', async () => {
        const refetch = vi.fn();
        mockUseBrowseOffers.mockReturnValue({data: {offers: []}} as any);
        mockUseBrowsePosts.mockReturnValue({
            data: {
                posts: [
                    {id: 'p1', title: 'Hello', url: '/hello/', visibility: 'public', published_at: '2025-01-01T00:00:00.000Z'}
                ]
            },
            refetch
        } as any);
        mockUseFilterableApi
            .mockReturnValueOnce({loadData: vi.fn().mockResolvedValue([])} as any)
            .mockReturnValueOnce({loadData: vi.fn().mockResolvedValue([])} as any);

        const {result} = renderHook(() => useKoenigLinkSuggestions({
            siteUrl: 'https://example.com/',
            membersSignupAccess: 'all',
            donationsEnabled: false,
            recommendationsEnabled: false
        }));

        const first = await result.current.searchLinks('');
        const second = await result.current.searchLinks('');

        expect(first).toEqual([{
            label: 'Latest posts',
            items: [{
                id: 'p1',
                title: 'Hello',
                url: '/hello/',
                visibility: 'public',
                publishedAt: '2025-01-01T00:00:00.000Z'
            }]
        }]);
        expect(second).toBe(first);
        expect(refetch).not.toHaveBeenCalled();
    });

    it('returns grouped, published-only links for search terms', async () => {
        const loadPosts = vi.fn().mockResolvedValue([
            {id: 'p1', title: 'Published Post', url: '/published/', status: 'published', visibility: 'public', published_at: '2025-01-01T00:00:00.000Z'},
            {id: 'p2', title: 'Draft Post', url: '/draft/', status: 'draft', visibility: 'public', published_at: '2025-01-02T00:00:00.000Z'}
        ]);
        const loadPages = vi.fn().mockResolvedValue([
            {id: 'pg1', title: 'Published Page', url: '/about/', status: 'published', visibility: 'members', published_at: '2025-01-03T00:00:00.000Z'},
            {id: 'pg2', title: 'Draft Page', url: '/about-draft/', status: 'draft', visibility: 'members', published_at: '2025-01-04T00:00:00.000Z'}
        ]);

        mockUseBrowseOffers.mockReturnValue({data: {offers: []}} as any);
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: []},
            refetch: vi.fn()
        } as any);
        mockUseFilterableApi
            .mockReturnValueOnce({loadData: loadPosts} as any)
            .mockReturnValueOnce({loadData: loadPages} as any);

        const {result} = renderHook(() => useKoenigLinkSuggestions({
            siteUrl: 'https://example.com/',
            membersSignupAccess: 'none',
            donationsEnabled: false,
            recommendationsEnabled: false
        }));

        const links = await result.current.searchLinks('pub');

        expect(loadPosts).toHaveBeenCalledWith('pub');
        expect(loadPages).toHaveBeenCalledWith('pub');
        expect(links).toEqual([
            {
                label: 'Posts',
                items: [{
                    id: 'p1',
                    title: 'Published Post',
                    url: '/published/',
                    visibility: 'public',
                    publishedAt: '2025-01-01T00:00:00.000Z'
                }]
            },
            {
                label: 'Pages',
                items: [{
                    id: 'pg1',
                    title: 'Published Page',
                    url: '/about/',
                    visibility: 'members',
                    publishedAt: '2025-01-03T00:00:00.000Z'
                }]
            }
        ]);
    });
});
