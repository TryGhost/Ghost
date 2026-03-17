import {MemoryRouter, useSearchParams} from 'react-router';
import {act, renderHook, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useFilterState} from './use-filter-state';

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => ({
        data: {
            settings: [{key: 'timezone', value: 'UTC'}]
        }
    })
}));

function createWrapper(initialEntry: string) {
    return function Wrapper({children}: {children: React.ReactNode}) {
        return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
    };
}

describe('useFilterState', () => {
    it('reads browser filter params', () => {
        const {result} = renderHook(() => {
            const state = useFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                search: searchParams.toString()
            };
        }, {wrapper: createWrapper('/?reported=is:true')});

        expect(result.current.filters).toEqual([
            {
                id: 'reported:1',
                field: 'reported',
                operator: 'is',
                values: ['true']
            }
        ]);
        expect(result.current.nql).toBe('count.reports:>0');
        expect(result.current.search).toBe('reported=is%3Atrue');
    });

    it('reads the shipped mainline comment operator spellings', () => {
        const {result} = renderHook(() => useFilterState(), {
            wrapper: createWrapper('/?post=is_not:post_123&body=not_contains:ghost')
        });

        expect(result.current.filters).toEqual([
            {
                id: 'post:1',
                field: 'post',
                operator: 'is_not',
                values: ['post_123']
            },
            {
                id: 'body:1',
                field: 'body',
                operator: 'not_contains',
                values: ['ghost']
            }
        ]);
        expect(result.current.nql).toBe('html:-~\'ghost\'+post_id:-post_123');
    });

    it('writes browser filter params and clears only filter params', () => {
        const {result} = renderHook(() => {
            const state = useFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                search: searchParams.toString()
            };
        }, {wrapper: createWrapper('/?thread=comment_123')});

        act(() => {
            result.current.setFilters([
                {
                    id: '1',
                    field: 'created_at',
                    operator: 'is',
                    values: ['2024-01-01']
                }
            ], {replace: false});
        });

        expect(result.current.search).toBe('thread=comment_123&created_at=is%3A2024-01-01');

        act(() => {
            result.current.clearFilters({replace: false});
        });

        expect(result.current.search).toBe('thread=comment_123');
    });

    it('ignores legacy filter params entirely', async () => {
        const {result} = renderHook(() => {
            const state = useFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                search: searchParams.toString()
            };
        }, {wrapper: createWrapper('/?filter=count.reports:>0&thread=comment_123')});

        expect(result.current.filters).toEqual([]);
        expect(result.current.nql).toBeUndefined();

        await waitFor(() => {
            expect(result.current.search).toBe('filter=count.reports%3A%3E0&thread=comment_123');
        });
    });

    it('tracks the single-id quick filter state', () => {
        const {result} = renderHook(() => useFilterState(), {
            wrapper: createWrapper('/?id=is:comment_123')
        });

        expect(result.current.isSingleIdFilter).toBe(true);
    });
});
