import {type MockedFunction, vi} from 'vitest';

// Setup mocks with vi.mock calls to ensure proper hoisting
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useMemberCountHistory: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useMrrHistory: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useNewsletterStats: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useNewsletterStatsByNewsletterId: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useSubscriberCount: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useSubscriberCountByNewsletterId: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useTopPostsStats: vi.fn().mockReturnValue({isLoading: false, data: []})
}));

vi.mock('../../../src/hooks/useGrowthStats', () => ({
    getRangeDates: vi.fn().mockImplementation((range: number) => {
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
        }
        return {
            dateFrom: '2023-01-01',
            endDate: '2023-01-30'
        };
    }),
    useGrowthStats: vi.fn()
}));

vi.mock('react', () => {
    const original = vi.importActual('react');
    return {
        ...original,
        useMemo: <T>(fn: () => T) => fn()
    };
});

// Now import the actual modules being tested
import {getRangeDates} from '../../../src/hooks/useGrowthStats';
import {
    useNewsletterStatsByNewsletterId,
    useSubscriberCountByNewsletterId
} from '@tryghost/admin-x-framework/api/stats';
import {useNewsletterStatsWithRange, useSubscriberCountWithRange} from '../../../src/hooks/useNewsletterStatsWithRange';

// Define TypeScript interface for mocked function return values
interface DateRange {
    dateFrom: string;
    endDate: string;
}

describe('Newsletter Stats Hooks with Range', function () {
    // Setup type for mocked functions
    const mockGetRangeDates = getRangeDates as MockedFunction<typeof getRangeDates>;
    const mockUseNewsletterStatsByNewsletterId = useNewsletterStatsByNewsletterId as MockedFunction<typeof useNewsletterStatsByNewsletterId>;
    const mockUseSubscriberCountByNewsletterId = useSubscriberCountByNewsletterId as MockedFunction<typeof useSubscriberCountByNewsletterId>;

    beforeEach(function () {
        vi.resetAllMocks();
        
        // Reset mock implementations
        mockGetRangeDates.mockImplementation((range: number): DateRange => {
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
            }
            return {
                dateFrom: '2023-01-01',
                endDate: '2023-01-30'
            };
        });
    });

    describe('useNewsletterStatsWithRange', function () {
        it('uses default values when no parameters provided', function () {
            useNewsletterStatsWithRange();

            expect(mockGetRangeDates).toHaveBeenCalledWith(30);
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                    date_from: '2023-01-01',
                    date_to: '2023-01-30',
                    order: 'date desc'
            });
        });

        it('uses provided range value', function () {
            useNewsletterStatsWithRange(7);

            expect(mockGetRangeDates).toHaveBeenCalledWith(7);
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                    date_from: '2023-01-01',
                    date_to: '2023-01-07',
                    order: 'date desc'
            });
        });

        it('uses provided order value', function () {
            useNewsletterStatsWithRange(undefined, 'open_rate desc');

            expect(mockGetRangeDates).toHaveBeenCalledWith(30);
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                    date_from: '2023-01-01',
                    date_to: '2023-01-30',
                    order: 'open_rate desc'
            });
        });

        it('uses both provided range and order values', function () {
            useNewsletterStatsWithRange(90, 'click_rate desc');

            expect(mockGetRangeDates).toHaveBeenCalledWith(90);
            expect(mockUseNewsletterStatsByNewsletterId).toHaveBeenCalledWith(undefined, {
                    date_from: '2023-01-01',
                    date_to: '2023-04-01',
                    order: 'click_rate desc'
            });
        });
    });

    describe('useSubscriberCountWithRange', function () {
        it('uses default values when no parameters provided', function () {
            useSubscriberCountWithRange();

            expect(mockGetRangeDates).toHaveBeenCalledWith(30);
            expect(mockUseSubscriberCountByNewsletterId).toHaveBeenCalledWith(undefined, {
                    date_from: '2023-01-01',
                    date_to: '2023-01-30'
            });
        });

        it('uses provided range value', function () {
            useSubscriberCountWithRange(7);

            expect(mockGetRangeDates).toHaveBeenCalledWith(7);
            expect(mockUseSubscriberCountByNewsletterId).toHaveBeenCalledWith(undefined, {
                    date_from: '2023-01-01',
                    date_to: '2023-01-07'
            });
        });

        it('uses provided large range value', function () {
            useSubscriberCountWithRange(90);

            expect(mockGetRangeDates).toHaveBeenCalledWith(90);
            expect(mockUseSubscriberCountByNewsletterId).toHaveBeenCalledWith(undefined, {
                    date_from: '2023-01-01',
                    date_to: '2023-04-01'
            });
        });
    });
}); 