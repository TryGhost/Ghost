import {act, renderHook} from '@testing-library/react';
import {MemoryRouter, useSearchParams} from 'react-router';
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
    it('reads Ember-style filter params', () => {
        const {result} = renderHook(() => {
            const state = useFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                search: searchParams.toString()
            };
        }, {wrapper: createWrapper('/?filter=count.reports:>0')});

        expect(result.current.filters).toEqual([
            {
                id: 'reported:1',
                field: 'reported',
                operator: 'is',
                values: ['true']
            }
        ]);
        expect(result.current.nql).toBe('count.reports:>0');
        expect(result.current.search).toBe('filter=count.reports%3A%3E0');
    });

    it('writes canonical Ember filter params and clears them', () => {
        const {result} = renderHook(() => {
            const state = useFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                search: searchParams.toString()
            };
        }, {wrapper: createWrapper('/')});

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

        expect(result.current.search).toBe(
            'filter=created_at%3A%3C%3D%272024-01-01T23%3A59%3A59.999Z%27%2Bcreated_at%3A%3E%3D%272024-01-01T00%3A00%3A00.000Z%27'
        );

        act(() => {
            result.current.clearFilters({replace: false});
        });

        expect(result.current.search).toBe('');
    });

    it('tracks the single-id quick filter state', () => {
        const {result} = renderHook(() => useFilterState(), {
            wrapper: createWrapper('/?filter=id:comment_123')
        });

        expect(result.current.isSingleIdFilter).toBe(true);
    });
});
