import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useMembersFilterState} from '@src/views/members/hooks/use-members-filter-state';

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
                created_at: 'is-or-greater:2022-02-22'
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
                'subscriptions.status': 'is:active'
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
});
