import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
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
                filter: 'created_at:>=\'2023-12-31T23:00:00.000Z\'+created_at:<=\'2024-01-01T22:59:59.999Z\''
            }),
            vi.fn()
        ]);

        mockUseBrowseSettings.mockReturnValue({
            data: {
                settings: [
                    {key: 'timezone', value: 'Europe/Stockholm'}
                ]
            }
        });
    });

    it('uses the site timezone when building exact-date comment filters', () => {
        const {result} = renderHook(() => useFilterState());

        expect(result.current.nql).toBe(
            'created_at:>=\'2023-12-31T23:00:00.000Z\'+created_at:<=\'2024-01-01T22:59:59.999Z\''
        );
    });

    it('uses the site timezone when writing exact-date comment filters back into the URL', () => {
        const setSearchParams = vi.fn();

        mockUseSearchParams.mockReturnValue([
            new URLSearchParams(),
            setSearchParams
        ]);

        const {result} = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilters([
                {
                    id: 'created-at-1',
                    field: 'created_at',
                    operator: 'is',
                    values: ['2024-01-01']
                }
            ]);
        });

        expect(setSearchParams).toHaveBeenCalledTimes(1);
        expect(setSearchParams.mock.calls[0][0].toString()).toBe('filter=created_at%3A%3E%3D%272023-12-31T23%3A00%3A00.000Z%27%2Bcreated_at%3A%3C%3D%272024-01-01T22%3A59%3A59.999Z%27');
        expect(setSearchParams.mock.calls[0][1]).toEqual({replace: true});
    });
});
