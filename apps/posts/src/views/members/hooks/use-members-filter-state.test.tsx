import {MemoryRouter, useSearchParams} from 'react-router';
import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useMembersFilterState} from './use-members-filter-state';
import type {ReactNode} from 'react';

const defaultSettingsData = {
    settings: [{key: 'timezone', value: 'UTC'}]
};
let settingsData: {settings: Array<{key: string; value: string}>} | undefined = defaultSettingsData;

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => ({
        data: settingsData
    })
}));

function createWrapper(initialEntry: string) {
    return function Wrapper({children}: {children: ReactNode}) {
        return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
    };
}

describe('useMembersFilterState', () => {
    beforeEach(() => {
        settingsData = {
            settings: [...defaultSettingsData.settings]
        };
    });

    it('drops unsupported OR filters when updating search params', () => {
        const {result} = renderHook(() => {
            const state = useMembersFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {
            wrapper: createWrapper('/?filter=status:paid,label:vip&search=jamie')
        });

        expect(result.current.filters).toEqual([]);
        expect(result.current.nql).toBeUndefined();

        act(() => {
            result.current.setSearch('alex', {replace: false});
        });

        expect(result.current.query).toBe('search=alex');
    });

    it('retains supported filters when unsupported OR compounds are present', () => {
        const {result} = renderHook(() => useMembersFilterState(), {
            wrapper: createWrapper('/?filter=(status:paid,label:vip)%2Bcreated_at%3A%3C%3D%272024-02-01T23%3A59%3A59.999Z%27')
        });

        expect(result.current.filters.map(({field, operator, values}) => ({field, operator, values}))).toEqual([
            {field: 'created_at', operator: 'is-or-less', values: ['2024-02-01']}
        ]);
        expect(result.current.nql).toBe('created_at:<=\'2024-02-01T23:59:59.999Z\'');
        expect(result.current.hasFilterOrSearch).toBe(true);
    });

    it('preserves raw date filters while settings are unresolved', () => {
        settingsData = undefined;

        const {result} = renderHook(() => {
            const state = useMembersFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {
            wrapper: createWrapper('/?filter=created_at%3A%3C%3D%272024-02-01T22%3A59%3A59.999Z%27&search=jamie')
        });

        expect(result.current.filters).toEqual([]);
        expect(result.current.nql).toBe('created_at:<=\'2024-02-01T22:59:59.999Z\'');

        act(() => {
            result.current.setSearch('alex', {replace: false});
        });

        expect(result.current.query).toBe('filter=created_at%3A%3C%3D%272024-02-01T22%3A59%3A59.999Z%27&search=alex');
    });

    it('preserves raw date filters when adding filters while settings are unresolved', () => {
        settingsData = undefined;

        const {result} = renderHook(() => {
            const state = useMembersFilterState();
            const [searchParams] = useSearchParams();

            return {
                ...state,
                query: searchParams.toString()
            };
        }, {
            wrapper: createWrapper('/?filter=created_at%3A%3C%3D%272024-02-01T22%3A59%3A59.999Z%27')
        });

        act(() => {
            result.current.setFilters([
                {
                    id: '1',
                    field: 'status',
                    operator: 'is',
                    values: ['paid']
                }
            ], {replace: false});
        });

        expect(result.current.query).toBe('filter=created_at%3A%3C%3D%272024-02-01T22%3A59%3A59.999Z%27%2Bstatus%3Apaid');
    });

    it('reads Ember-style filter params and keeps search separate', () => {
        const {result} = renderHook(() => useMembersFilterState(), {
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
            const state = useMembersFilterState();
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
            const state = useMembersFilterState();
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
            const state = useMembersFilterState();
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
