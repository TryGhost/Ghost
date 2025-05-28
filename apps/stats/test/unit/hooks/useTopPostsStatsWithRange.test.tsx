import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, setupStatsAppMocks} from '../../utils/test-helpers';
import {renderHook} from '@testing-library/react';
import {useTopPostsStatsWithRange} from '@src/hooks/useTopPostsStatsWithRange';

// Mock the dependencies
vi.mock('@src/hooks/useGrowthStats', () => ({
    getRangeDates: vi.fn((range: number) => ({
        dateFrom: `2024-01-${String(31 - range).padStart(2, '0')}`,
        endDate: '2024-01-31'
    }))
}));

vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@src/providers/GlobalDataProvider');

const mockUseTopPostsStats = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useTopPostsStats;

describe('useTopPostsStatsWithRange', () => {
    let mocks: ReturnType<typeof setupStatsAppMocks>;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks = setupStatsAppMocks();
        
        // Apply the mocks to the actual imported modules
        mockUseTopPostsStats.mockImplementation(mocks.mockUseTopPostsStats);
    });

    it('uses default range of 30 days when no range provided', () => {
        const wrapper = createTestWrapper();
        renderHook(() => useTopPostsStatsWithRange(), {wrapper});
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                order: 'mrr desc'
            }
        });
    });

    it('uses default order of "mrr desc" when no order provided', () => {
        const wrapper = createTestWrapper();
        renderHook(() => useTopPostsStatsWithRange(7), {wrapper});
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-24',
                date_to: '2024-01-31',
                order: 'mrr desc'
            }
        });
    });

    it('accepts custom range parameter', () => {
        const wrapper = createTestWrapper();
        renderHook(() => useTopPostsStatsWithRange(14), {wrapper});
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-17',
                date_to: '2024-01-31',
                order: 'mrr desc'
            }
        });
    });

    it('accepts custom order parameter', () => {
        const wrapper = createTestWrapper();
        renderHook(() => useTopPostsStatsWithRange(30, 'free_members desc'), {wrapper});
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                order: 'free_members desc'
            }
        });
    });

    it('accepts paid_members desc order', () => {
        const wrapper = createTestWrapper();
        renderHook(() => useTopPostsStatsWithRange(30, 'paid_members desc'), {wrapper});
        
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2024-01-01',
                date_to: '2024-01-31',
                order: 'paid_members desc'
            }
        });
    });

    it('filters out undefined values from search params', () => {
        const wrapper = createTestWrapper();
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
        const wrapper = createTestWrapper();
        const {result} = renderHook(() => useTopPostsStatsWithRange(), {wrapper});
        
        // Just verify that the hook returns something (the mocked result)
        expect(result.current).toBeDefined();
    });
}); 