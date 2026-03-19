import {MemoryRouter, useSearchParams} from 'react-router';
import {act, renderHook, waitFor} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {shouldDelayMembersDateFilterHydration, useMembersFilterState} from './use-members-filter-state';
import type {ReactNode} from 'react';

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => ({
        data: {settings: [{key: 'timezone', value: 'UTC'}]}
    })
}));

function createWrapper(initialEntry: string) {
    return function Wrapper({children}: {children: ReactNode}) {
        return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
    };
}

describe('shouldDelayMembersDateFilterHydration', () => {
    it('waits for timezone resolution when date filters are present', () => {
        expect(shouldDelayMembersDateFilterHydration('created_at:<=\'2024-02-01T22:59:59.999Z\'', false)).toBe(true);
    });

    it('does not wait for unsupported non-date filters', () => {
        expect(shouldDelayMembersDateFilterHydration('status:paid,label:vip', false)).toBe(false);
    });

    it('does not wait once the site timezone is resolved', () => {
        expect(shouldDelayMembersDateFilterHydration('created_at:<=\'2024-02-01T22:59:59.999Z\'', true)).toBe(false);
    });
});

describe('useMembersFilterState', () => {
    it('drops unsupported OR filters and rewrites the URL canonically', async () => {
        const {result} = renderHook(() => {
            const state = useMembersFilterState('UTC');
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {
            wrapper: createWrapper('/?filter=status:paid,label:vip')
        });

        await waitFor(() => {
            expect(result.current.query).toBe('');
        });

        expect(result.current.filters).toEqual([]);
        expect(result.current.nql).toBeUndefined();
        expect(result.current.hasFilterOrSearch).toBe(false);
    });

    it('retains supported filters and rewrites mixed URLs canonically', async () => {
        const {result} = renderHook(() => {
            const state = useMembersFilterState('UTC');
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {
            wrapper: createWrapper('/?filter=(status:paid,label:vip)%2Bcreated_at%3A%3C%3D%272024-02-01T23%3A59%3A59.999Z%27')
        });

        await waitFor(() => {
            expect(result.current.nql).toBe('created_at:<=\'2024-02-01T23:59:59.999Z\'');
        });

        expect(result.current.filters.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2024-02-01']}
        ]);
        expect(result.current.nql).toBe('created_at:<=\'2024-02-01T23:59:59.999Z\'');
        expect(result.current.hasFilterOrSearch).toBe(true);
        expect(result.current.query).toBe('filter=created_at%3A%3C%3D%272024-02-01T23%3A59%3A59.999Z%27');
    });

    it('reads Ember-style filter params and keeps search separate', () => {
        const {result} = renderHook(() => useMembersFilterState('UTC'), {
            wrapper: createWrapper('/?filter=status:paid&search=jamie')
        });

        expect(result.current.filters).toEqual([
            {
                id: 'status:1',
                field: 'status',
                operator: 'is',
                values: ['paid']
            }
        ]);
        expect(result.current.search).toBe('jamie');
        expect(result.current.hasFilterOrSearch).toBe(true);
    });

    it('writes canonical Ember filter params', () => {
        const {result} = renderHook(() => {
            const state = useMembersFilterState('UTC');
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {wrapper: createWrapper('/')});

        act(() => {
            result.current.setFilters([
                {
                    id: '1',
                    field: 'emails.post_id',
                    operator: 'is',
                    values: ['post_123']
                },
                {
                    id: '2',
                    field: 'status',
                    operator: 'is',
                    values: ['paid']
                }
            ], {replace: false});
        });

        expect(result.current.query).toBe('filter=emails.post_id%3A%27post_123%27%2Bstatus%3Apaid');
    });

    it('preserves search when clearing filters', () => {
        const {result} = renderHook(() => {
            const state = useMembersFilterState('UTC');
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {wrapper: createWrapper('/?filter=status:paid&search=jamie')});

        act(() => {
            result.current.clearFilters({replace: false});
        });

        expect(result.current.query).toBe('search=jamie');
        expect(result.current.filters).toEqual([]);
        expect(result.current.search).toBe('jamie');
    });

    it('can clear both filters and search for empty-state reset flows', () => {
        const {result} = renderHook(() => {
            const state = useMembersFilterState('UTC');
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {wrapper: createWrapper('/?filter=status:paid&search=jamie')});

        act(() => {
            result.current.clearAll({replace: false});
        });

        expect(result.current.query).toBe('');
        expect(result.current.filters).toEqual([]);
        expect(result.current.search).toBe('');
        expect(result.current.hasFilterOrSearch).toBe(false);
    });
});
