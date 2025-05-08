import {type MockedFunction, vi} from 'vitest';
import {getRangeDates} from '../../../src/hooks/useGrowthStats';
import {useNewsletterStats, useSubscriberCount} from '@tryghost/admin-x-framework/api/stats';
import {useNewsletterStatsWithRange, useSubscriberCountWithRange} from '../../../src/hooks/useNewsletterStatsWithRange';

// Mock the dependent hooks and functions
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useNewsletterStats: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useSubscriberCount: vi.fn().mockReturnValue({isLoading: false, data: []})
}));

vi.mock('../../../src/hooks/useGrowthStats', () => ({
    getRangeDates: vi.fn(),
    useGrowthStats: vi.fn()
}));

// Mock React's useMemo to just call the function directly
vi.mock('react', () => {
    const original = vi.importActual('react');
    return {
        ...original,
        useMemo: <T>(fn: () => T) => fn()
    };
});

describe('Newsletter Stats Hooks with Range', function () {
    // Setup type for mocked functions
    const mockUseNewsletterStats = useNewsletterStats as unknown as MockedFunction<typeof useNewsletterStats>;
    const mockUseSubscriberCount = useSubscriberCount as unknown as MockedFunction<typeof useSubscriberCount>;
    const mockGetRangeDates = getRangeDates as unknown as MockedFunction<typeof getRangeDates>;

    beforeEach(function () {
        vi.resetAllMocks();
        
        // Setup mock for getRangeDates with appropriate return values
        mockGetRangeDates.mockImplementation(function (range: number) {
            if (range === 7) {
                return {
                    dateFrom: '2023-01-01',
                    endDate: '2023-01-07'
                };
            } else if (range === 90) {
                return {
                    dateFrom: '2023-01-01',
                    endDate: '2023-04-01'
                };
            } else {
                // Default case (30 days)
                return {
                    dateFrom: '2023-01-01',
                    endDate: '2023-01-30'
                };
            }
        });
    });

    describe('useNewsletterStatsWithRange', function () {
        it('uses default values when no parameters provided', function () {
            useNewsletterStatsWithRange();

            expect(mockGetRangeDates).toHaveBeenCalledWith(30);
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01',
                    date_to: '2023-01-30',
                    order: 'date desc'
                }
            });
        });

        it('uses provided range value', function () {
            useNewsletterStatsWithRange(7);

            expect(mockGetRangeDates).toHaveBeenCalledWith(7);
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01',
                    date_to: '2023-01-07',
                    order: 'date desc'
                }
            });
        });

        it('uses provided order value', function () {
            useNewsletterStatsWithRange(undefined, 'open_rate desc');

            expect(mockGetRangeDates).toHaveBeenCalledWith(30);
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01',
                    date_to: '2023-01-30',
                    order: 'open_rate desc'
                }
            });
        });

        it('uses both provided range and order values', function () {
            useNewsletterStatsWithRange(90, 'click_rate desc');

            expect(mockGetRangeDates).toHaveBeenCalledWith(90);
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01',
                    date_to: '2023-04-01',
                    order: 'click_rate desc'
                }
            });
        });
    });

    describe('useSubscriberCountWithRange', function () {
        it('uses default values when no parameters provided', function () {
            useSubscriberCountWithRange();

            expect(mockGetRangeDates).toHaveBeenCalledWith(30);
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01',
                    date_to: '2023-01-30'
                }
            });
        });

        it('uses provided range value', function () {
            useSubscriberCountWithRange(7);

            expect(mockGetRangeDates).toHaveBeenCalledWith(7);
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01',
                    date_to: '2023-01-07'
                }
            });
        });

        it('uses provided large range value', function () {
            useSubscriberCountWithRange(90);

            expect(mockGetRangeDates).toHaveBeenCalledWith(90);
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01',
                    date_to: '2023-04-01'
                }
            });
        });
    });
}); 