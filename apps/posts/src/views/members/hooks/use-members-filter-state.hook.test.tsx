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
});
