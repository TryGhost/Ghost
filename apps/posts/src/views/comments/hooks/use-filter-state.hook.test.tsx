import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useFilterState} from '@src/views/comments/hooks/use-filter-state';

const mockUseSearchParams = vi.fn();
const mockUseBrowseSettings = vi.fn();

vi.mock('@tryghost/admin-x-framework', () => ({
    useSearchParams: () => mockUseSearchParams()
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: () => mockUseBrowseSettings()
}));

describe('comments useFilterState hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseSearchParams.mockReturnValue([
            new URLSearchParams({
                created_at: 'is:2024-01-01'
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

    it('uses the site timezone when building exact-date comment filters', () => {
        const {result} = renderHook(() => useFilterState());

        expect(result.current.nql).toBe(
            'created_at:>=\'2024-01-01T05:00:00.000Z\'+created_at:<=\'2024-01-02T04:59:59.999Z\''
        );
    });
});
