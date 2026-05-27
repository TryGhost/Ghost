import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useTierValueSource} from '@src/hooks/filter-sources/use-tier-value-source';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

const {mockUseBrowseTiers} = vi.hoisted(() => ({
    mockUseBrowseTiers: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/tiers', () => ({
    useBrowseTiers: mockUseBrowseTiers
}));

function tier(overrides: Partial<Tier>): Tier {
    return {
        id: 'tier-id',
        name: 'Tier',
        description: null,
        slug: 'tier',
        active: true,
        type: 'paid',
        welcome_page_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        visibility: 'public',
        benefits: [],
        trial_days: 0,
        ...overrides
    };
}

function mockTiersResponse({
    tiers = [],
    isEnd = true,
    isFetchingNextPage = false,
    isLoading = false,
    fetchNextPage = vi.fn()
}: {
    tiers?: Tier[];
    isEnd?: boolean;
    isFetchingNextPage?: boolean;
    isLoading?: boolean;
    fetchNextPage?: ReturnType<typeof vi.fn>;
} = {}) {
    mockUseBrowseTiers.mockReturnValue({
        data: {
            tiers,
            isEnd
        },
        fetchNextPage,
        isFetchingNextPage,
        isLoading
    });
}

describe('useTierValueSource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('exposes active and archived tier options in display order', () => {
        mockTiersResponse({
            tiers: [
                tier({id: 'archived', name: 'Archived Gold', slug: 'archived-gold', active: false}),
                tier({id: 'active', name: 'Active Gold', slug: 'active-gold', active: true})
            ]
        });

        const {result} = renderHook(() => {
            const source = useTierValueSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        expect(result.current.options).toEqual([
            {
                value: 'active',
                label: 'Active Gold',
                detail: 'active-gold'
            },
            {
                value: 'archived',
                label: 'Archived Gold (archived)',
                detail: 'archived-gold'
            }
        ]);
    });

    it('counts fetched paid tiers when deciding if the tier filter is available', () => {
        const cases = [
            {
                tiers: [
                    tier({id: 'active', active: true}),
                    tier({id: 'archived', active: false})
                ],
                expected: true
            },
            {
                tiers: [
                    tier({id: 'archived-1', active: false}),
                    tier({id: 'archived-2', active: false})
                ],
                expected: true
            },
            {
                tiers: [
                    tier({id: 'archived', active: false})
                ],
                expected: false
            },
            {
                tiers: [],
                expected: false
            }
        ];

        for (const testCase of cases) {
            mockTiersResponse({tiers: testCase.tiers});

            const {result} = renderHook(() => useTierValueSource());

            expect(result.current.hasMultipleTiers).toBe(testCase.expected);
        }
    });

    it('treats an incomplete tiers response as multiple tiers', () => {
        mockTiersResponse({
            tiers: [
                tier({id: 'active', active: true})
            ],
            isEnd: false
        });

        const {result} = renderHook(() => useTierValueSource());

        expect(result.current.hasMultipleTiers).toBe(true);
    });

    it('fetches paid tiers with a numeric page limit and exposes tier options', () => {
        mockTiersResponse({
            tiers: [
                tier({id: 'active-tier', name: 'Active Gold', slug: 'active-gold', active: true}),
                tier({id: 'archived-tier', name: 'Archived Gold', slug: 'archived-gold', active: false})
            ]
        });

        const {result} = renderHook(() => {
            const source = useTierValueSource();
            return {
                hasMultipleTiers: source.hasMultipleTiers,
                state: source.useOptions({query: '', selectedValues: []})
            };
        });

        expect(mockUseBrowseTiers).toHaveBeenCalledWith({searchParams: {filter: 'type:paid', limit: '100'}});
        expect(result.current.hasMultipleTiers).toBe(true);
        expect(result.current.state.options).toEqual([
            {
                value: 'active-tier',
                label: 'Active Gold',
                detail: 'active-gold'
            },
            {
                value: 'archived-tier',
                label: 'Archived Gold (archived)',
                detail: 'archived-gold'
            }
        ]);
    });

    it('searches local tier options by archived label text', () => {
        mockTiersResponse({
            tiers: [
                tier({id: 'active-tier', name: 'Active Gold', slug: 'active-gold', active: true}),
                tier({id: 'archived-tier', name: 'Archived Gold', slug: 'archived-gold', active: false})
            ]
        });

        const {result} = renderHook(() => {
            const source = useTierValueSource();
            return source.useOptions({query: 'archived', selectedValues: []});
        });

        expect(result.current.options).toEqual([
            {
                value: 'archived-tier',
                label: 'Archived Gold (archived)',
                detail: 'archived-gold'
            }
        ]);
    });

    it('keeps options in the initial load state while additional tier pages are loading', () => {
        mockTiersResponse({
            tiers: [
                tier({id: 'active-tier', name: 'Active Gold', slug: 'active-gold', active: true})
            ],
            isEnd: false,
            isFetchingNextPage: true
        });

        const {result} = renderHook(() => {
            const source = useTierValueSource();
            return source.useOptions({query: '', selectedValues: []});
        });

        expect(result.current.options).toEqual([]);
        expect(result.current.isInitialLoad).toBe(true);
    });

    it('loads the next page until the tiers response is complete', () => {
        const fetchNextPage = vi.fn();
        mockTiersResponse({
            tiers: [tier({id: 'active-tier'})],
            isEnd: false,
            fetchNextPage
        });

        renderHook(() => useTierValueSource());

        expect(fetchNextPage).toHaveBeenCalledOnce();
    });

    it('does not load another page while a tiers page is already loading', () => {
        const fetchNextPage = vi.fn();
        mockTiersResponse({
            tiers: [tier({id: 'active-tier'})],
            isEnd: false,
            isFetchingNextPage: true,
            fetchNextPage
        });

        renderHook(() => useTierValueSource());

        expect(fetchNextPage).not.toHaveBeenCalled();
    });
});
