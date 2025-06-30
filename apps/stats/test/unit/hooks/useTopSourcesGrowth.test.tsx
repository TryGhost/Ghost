import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mockError, mockLoading, mockSuccess} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import {renderHook} from '@testing-library/react';
import {useTopSourcesGrowth} from '@src/hooks/useTopSourcesGrowth';

// Mock external dependencies
vi.mock('@tryghost/shade', () => ({
    formatQueryDate: vi.fn(),
    getRangeDates: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/referrers', () => ({
    useTopSourcesGrowth: vi.fn()
}));

vi.mock('@src/providers/GlobalDataProvider', () => ({
    useGlobalData: vi.fn()
}));

vi.mock('@src/views/Stats/components/AudienceSelect', () => ({
    getAudienceQueryParam: vi.fn()
}));

const mockFormatQueryDate = vi.mocked(await import('@tryghost/shade')).formatQueryDate;
const mockGetRangeDates = vi.mocked(await import('@tryghost/shade')).getRangeDates;
const mockUseTopSourcesGrowthAPI = vi.mocked(await import('@tryghost/admin-x-framework/api/referrers')).useTopSourcesGrowth;
const mockUseGlobalData = vi.mocked(await import('@src/providers/GlobalDataProvider')).useGlobalData;
const mockGetAudienceQueryParam = vi.mocked(await import('@src/views/Stats/components/AudienceSelect')).getAudienceQueryParam;

describe('useTopSourcesGrowth', () => {
    const mockStartDate = new Date('2024-01-01');
    const mockEndDate = new Date('2024-01-31');
    const mockTimezone = 'UTC';

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mock implementations
        mockGetRangeDates.mockReturnValue({
            startDate: mockStartDate,
            endDate: mockEndDate,
            timezone: mockTimezone
        });
        
        mockFormatQueryDate.mockImplementation((date: Date) => date.toISOString().split('T')[0]);
        
        mockUseGlobalData.mockReturnValue({
            audience: 'all-members'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        
        mockGetAudienceQueryParam.mockReturnValue('all');
        
        mockSuccess(mockUseTopSourcesGrowthAPI, {stats: []});
    });

    it('calls useTopSourcesGrowthAPI with correct default parameters', () => {
        renderHook(() => useTopSourcesGrowth(30));

        expect(mockUseTopSourcesGrowthAPI).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                member_status: 'all',
                order: 'signups desc',
                limit: '50',
                timezone: 'UTC'
            }
        });
    });

    it('calls useTopSourcesGrowthAPI with custom parameters', () => {
        renderHook(() => useTopSourcesGrowth(7, 'clicks desc', 25));

        expect(mockUseTopSourcesGrowthAPI).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                member_status: 'all',
                order: 'clicks desc',
                limit: '25',
                timezone: 'UTC'
            }
        });
    });

    it('handles different audience types', () => {
        mockUseGlobalData.mockReturnValue({
            audience: 2 // Represents paid members (binary representation)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        mockGetAudienceQueryParam.mockReturnValue('paid');

        renderHook(() => useTopSourcesGrowth(30));

        expect(mockGetAudienceQueryParam).toHaveBeenCalledWith(2);
        expect(mockUseTopSourcesGrowthAPI).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                member_status: 'paid',
                order: 'signups desc',
                limit: '50',
                timezone: 'UTC'
            }
        });
    });

    it('handles no timezone case', () => {
        mockGetRangeDates.mockReturnValue({
            startDate: mockStartDate,
            endDate: mockEndDate,
            timezone: null
        });

        renderHook(() => useTopSourcesGrowth(30));

        expect(mockUseTopSourcesGrowthAPI).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                member_status: 'all',
                order: 'signups desc',
                limit: '50'
                // timezone should not be included
            }
        });
    });

    it('handles empty timezone case', () => {
        mockGetRangeDates.mockReturnValue({
            startDate: mockStartDate,
            endDate: mockEndDate,
            timezone: ''
        });

        renderHook(() => useTopSourcesGrowth(30));

        expect(mockUseTopSourcesGrowthAPI).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                member_status: 'all',
                order: 'signups desc',
                limit: '50'
                // empty timezone should not be included
            }
        });
    });

    it('correctly formats query dates', () => {
        const customStartDate = new Date('2024-06-15');
        const customEndDate = new Date('2024-07-15');
        
        mockGetRangeDates.mockReturnValue({
            startDate: customStartDate,
            endDate: customEndDate,
            timezone: 'America/New_York'
        });

        renderHook(() => useTopSourcesGrowth(30));

        expect(mockFormatQueryDate).toHaveBeenCalledWith(customStartDate);
        expect(mockFormatQueryDate).toHaveBeenCalledWith(customEndDate);
    });

    it('returns the result from useTopSourcesGrowthAPI', () => {
        mockSuccess(mockUseTopSourcesGrowthAPI, 
            {stats: [{source: 'Google', signups: 100, date: '2024-01-01', paid_conversions: 10, mrr: 1000}]}
        );

        const {result} = renderHook(() => useTopSourcesGrowth(30));

        expect(result.current.data?.stats).toHaveLength(1);
    });

    it('handles loading state', () => {
        mockLoading(mockUseTopSourcesGrowthAPI);

        const {result} = renderHook(() => useTopSourcesGrowth(30));

        expect(result.current.isLoading).toBe(true);
    });

    it('handles error state', () => {
        const apiError = new Error('API Error');
        mockError(mockUseTopSourcesGrowthAPI, apiError);

        const {result} = renderHook(() => useTopSourcesGrowth(30));

        expect(result.current.error).toBe(apiError);
    });

    it('handles various order by values', () => {
        const orderByValues = ['signups desc', 'clicks desc', 'signups asc', 'name asc'];
        
        orderByValues.forEach((orderBy) => {
            renderHook(() => useTopSourcesGrowth(30, orderBy));
            
            expect(mockUseTopSourcesGrowthAPI).toHaveBeenCalledWith({
                searchParams: expect.objectContaining({
                    order: orderBy
                })
            });
        });
    });

    it('handles various limit values', () => {
        const limitValues = [10, 25, 50, 100];
        
        limitValues.forEach((limit) => {
            renderHook(() => useTopSourcesGrowth(30, 'signups desc', limit));
            
            expect(mockUseTopSourcesGrowthAPI).toHaveBeenCalledWith({
                searchParams: expect.objectContaining({
                    limit: limit.toString()
                })
            });
        });
    });

    it('handles various range values', () => {
        const ranges = [1, 7, 30, 90];
        
        ranges.forEach((range) => {
            renderHook(() => useTopSourcesGrowth(range));
            
            expect(mockGetRangeDates).toHaveBeenCalledWith(range);
        });
    });
});