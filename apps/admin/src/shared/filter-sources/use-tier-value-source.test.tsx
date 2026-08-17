import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useTierValueSource} from './use-tier-value-source';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

const {mockUseBrowseTiers} = vi.hoisted(() => ({
    mockUseBrowseTiers: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/tiers', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@tryghost/admin-x-framework/api/tiers')>();
    return {
        ...actual,
        useBrowseTiers: mockUseBrowseTiers
    };
});

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
    isLoading = false
}: {
    tiers?: Tier[];
    isLoading?: boolean;
} = {}) {
    mockUseBrowseTiers.mockReturnValue({
        data: {tiers},
        isLoading
    });
}

describe('useTierValueSource', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches every paid tier in a single request', () => {
        mockTiersResponse();

        renderHook(() => useTierValueSource());

        expect(mockUseBrowseTiers).toHaveBeenCalledWith({searchParams: {filter: 'type:paid'}});
    });

    it('handles the first render before any tiers data has loaded', () => {
        mockUseBrowseTiers.mockReturnValue({data: undefined, isLoading: true});

        const {result} = renderHook(() => {
            const source = useTierValueSource();
            return {
                hasMultipleTiers: source.hasMultipleTiers,
                state: source.valueSource.useOptions({query: '', selectedValues: []})
            };
        });

        expect(result.current.hasMultipleTiers).toBe(false);
        expect(result.current.state.options).toEqual([]);
        expect(result.current.state.isInitialLoad).toBe(true);
    });

    it('exposes active tiers before archived tiers, labelling archived ones', () => {
        mockTiersResponse({
            tiers: [
                tier({id: 'archived', name: 'Archived Gold', slug: 'archived-gold', active: false}),
                tier({id: 'active', name: 'Active Gold', slug: 'active-gold', active: true})
            ]
        });

        const {result} = renderHook(() => {
            const {valueSource} = useTierValueSource();
            return valueSource.useOptions({query: '', selectedValues: []});
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

    it('counts paid tiers when deciding if the tier filter is available', () => {
        const cases = [
            {
                tiers: [tier({id: 'active', active: true}), tier({id: 'archived', active: false})],
                expected: true
            },
            {
                tiers: [tier({id: 'archived-1', active: false}), tier({id: 'archived-2', active: false})],
                expected: true
            },
            {
                tiers: [tier({id: 'archived', active: false})],
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

    it('searches local tier options by archived label text', () => {
        mockTiersResponse({
            tiers: [
                tier({id: 'active-tier', name: 'Active Gold', slug: 'active-gold', active: true}),
                tier({id: 'archived-tier', name: 'Archived Gold', slug: 'archived-gold', active: false})
            ]
        });

        const {result} = renderHook(() => {
            const {valueSource} = useTierValueSource();
            return valueSource.useOptions({query: 'archived', selectedValues: []});
        });

        expect(result.current.options).toEqual([
            {
                value: 'archived-tier',
                label: 'Archived Gold (archived)',
                detail: 'archived-gold'
            }
        ]);
    });

    it('reports the initial load state while tiers are loading', () => {
        mockTiersResponse({tiers: [], isLoading: true});

        const {result} = renderHook(() => {
            const source = useTierValueSource();
            return {
                hasMultipleTiers: source.hasMultipleTiers,
                state: source.valueSource.useOptions({query: '', selectedValues: []})
            };
        });

        expect(result.current.hasMultipleTiers).toBe(false);
        expect(result.current.state.options).toEqual([]);
        expect(result.current.state.isInitialLoad).toBe(true);
    });
});
