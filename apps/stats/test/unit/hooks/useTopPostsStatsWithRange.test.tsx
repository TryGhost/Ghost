import {TestWrapper} from '@tryghost/admin-x-framework/test/test-utils';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getExpectedDateRange, setupDateMocking, setupStatsAppMocks} from '../../utils/test-helpers';
import {renderHook} from '@testing-library/react';
import {useTopPostsStatsWithRange} from '@src/hooks/useTopPostsStatsWithRange';

vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@src/providers/GlobalDataProvider');
vi.mock('@tryghost/shade', () => ({
    formatQueryDate: vi.fn(),
    getRangeDates: vi.fn()
}));

const mockUseTopPostsStats = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useTopPostsStats;
const {formatQueryDate, getRangeDates} = await import('@tryghost/shade');
const mockFormatQueryDate = vi.mocked(formatQueryDate);
const mockGetRangeDates = vi.mocked(getRangeDates);

describe('useTopPostsStatsWithRange', () => {
    let mocks: ReturnType<typeof setupStatsAppMocks>;
    let dateMocking: ReturnType<typeof setupDateMocking>;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks = setupStatsAppMocks();
        dateMocking = setupDateMocking();
        
        // Mock the date functions with consistent behavior
        mockGetRangeDates.mockImplementation((range: number) => {
            const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(range);
            return {
                startDate: new Date(expectedDateFrom + 'T00:00:00.000Z'),
                endDate: new Date(expectedDateTo + 'T23:59:59.999Z'),
                timezone: 'UTC'
            };
        });
        
        mockFormatQueryDate.mockImplementation((date: Date) => date.toISOString().split('T')[0]);
        
        // Apply the mocks to the actual imported modules
        mockUseTopPostsStats.mockImplementation(mocks.mockUseTopPostsStats);
    });

    afterEach(function () {
        dateMocking.cleanup();
    });

    it('uses default range of 30 days when no range provided', () => {
        const wrapper = TestWrapper;
        renderHook(() => useTopPostsStatsWithRange(), {wrapper});
        
        const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(30);
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: expectedDateFrom,
                date_to: expectedDateTo,
                order: 'mrr desc'
            }
        });
    });

    it('uses default order of "mrr desc" when no order provided', () => {
        const wrapper = TestWrapper;
        renderHook(() => useTopPostsStatsWithRange(7), {wrapper});
        
        const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(7);
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: expectedDateFrom,
                date_to: expectedDateTo,
                order: 'mrr desc'
            }
        });
    });

    it('accepts custom range parameter', () => {
        const wrapper = TestWrapper;
        renderHook(() => useTopPostsStatsWithRange(14), {wrapper});
        
        const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(14);
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: expectedDateFrom,
                date_to: expectedDateTo,
                order: 'mrr desc'
            }
        });
    });

    it('accepts custom order parameter', () => {
        const wrapper = TestWrapper;
        renderHook(() => useTopPostsStatsWithRange(30, 'free_members desc'), {wrapper});
        
        const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(30);
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: expectedDateFrom,
                date_to: expectedDateTo,
                order: 'free_members desc'
            }
        });
    });

    it('accepts paid_members desc order', () => {
        const wrapper = TestWrapper;
        renderHook(() => useTopPostsStatsWithRange(30, 'paid_members desc'), {wrapper});
        
        const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(30);
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: expectedDateFrom,
                date_to: expectedDateTo,
                order: 'paid_members desc'
            }
        });
    });

    it('filters out undefined values from search params', () => {
        const wrapper = TestWrapper;
        renderHook(() => useTopPostsStatsWithRange(7, 'mrr desc'), {wrapper});
        
        const calledWith = mockUseTopPostsStats.mock.calls[0]?.[0];
        
        expect(calledWith).toBeDefined();
        expect(calledWith?.searchParams).toBeDefined();
        
        // Ensure no undefined values are passed
        if (calledWith?.searchParams) {
            Object.values(calledWith.searchParams).forEach((value) => {
                expect(value).not.toBeUndefined();
            });
        }
    });

    it('returns the result from useTopPostsStats', () => {
        const wrapper = TestWrapper;
        const {result} = renderHook(() => useTopPostsStatsWithRange(), {wrapper});
        
        // Just verify that the hook returns something (the mocked result)
        expect(result.current).toBeDefined();
    });
}); 