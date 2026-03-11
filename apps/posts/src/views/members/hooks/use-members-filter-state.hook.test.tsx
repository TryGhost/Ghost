import {beforeEach, describe, expect, expectTypeOf, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useMembersFilterState} from '@src/views/members/hooks/use-members-filter-state';
import type {MemberPredicate} from '@src/views/filters/member-fields';

const mockUseSearchParams = vi.fn();
const mockUseBrowseSettings = vi.fn();

vi.mock('@tryghost/admin-x-framework', () => ({
    useSearchParams: () => mockUseSearchParams()
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => mockUseBrowseSettings()
}));

describe('useMembersFilterState', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                filter: 'created_at:>=\'2022-02-22 05:00:00\''
            }),
            vi.fn()
        ]);

        mockUseBrowseSettings.mockReturnValue({
            data: {
                settings: [
                    {key: 'timezone', value: 'America/New_York'}
                ]
            }
        });
    });

    it('uses the site timezone when building member NQL', () => {
        const {result} = renderHook(() => useMembersFilterState());

        expectTypeOf(result.current.filters).toEqualTypeOf<MemberPredicate[]>();
        expect(result.current.nql).toBe('created_at:>=\'2022-02-22 05:00:00\'');
    });

    it('derives filter flags separately from search state', () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                search: 'alex'
            }),
            vi.fn()
        ]);

        const {result} = renderHook(() => useMembersFilterState());

        expect(result.current.hasFilters).toBe(false);
        expect(result.current.hasSearch).toBe(true);
        expect(result.current.hasFilterOrSearch).toBe(true);
    });

    it('exposes active field metadata for table adaptation', () => {
        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                filter: 'subscriptions.status:active'
            }),
            vi.fn()
        ]);

        const {result} = renderHook(() => useMembersFilterState());

        expect(result.current.activeFields).toEqual(['subscriptions.status']);
        expect(result.current.activeColumns).toEqual([
            {
                key: 'subscriptions.status',
                label: 'Stripe subscription status',
                include: 'subscriptions'
            }
        ]);
    });

    it('does not write invalid member predicates back into the URL state', () => {
        const setSearchParams = vi.fn();

        mockUseSearchParams.mockReturnValue([
            new URLSearchParams(),
            setSearchParams
        ]);

        const {result} = renderHook(() => useMembersFilterState());

        result.current.setFilters([
            {
                id: 'status-1',
                field: 'status',
                operator: 'contains',
                values: ['paid']
            }
        ] as never);

        expect(setSearchParams).toHaveBeenCalledTimes(1);
        expect(setSearchParams.mock.calls[0][0].toString()).toBe('');
        expect(setSearchParams.mock.calls[0][1]).toEqual({replace: true});
    });
});
