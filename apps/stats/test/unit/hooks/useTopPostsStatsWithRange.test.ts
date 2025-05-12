import {type MockedFunction, vi} from 'vitest';

// Setup mocks with vi.mock calls to ensure proper hoisting
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useNewsletterStats: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useSubscriberCount: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useMemberCountHistory: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useMrrHistory: vi.fn().mockReturnValue({isLoading: false, data: []}),
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
import {useTopPostsStats} from '@tryghost/admin-x-framework/api/stats';
import {useTopPostsStatsWithRange} from '../../../src/hooks/useTopPostsStatsWithRange';

// Define TypeScript interface for mocked function return values
interface DateRange {
    dateFrom: string;
    endDate: string;
}

describe('useTopPostsStatsWithRange', function () {
    // Setup type for mocked functions
    const mockUseTopPostsStats = useTopPostsStats as MockedFunction<typeof useTopPostsStats>;
    const mockGetRangeDates = getRangeDates as MockedFunction<typeof getRangeDates>;

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

    it('uses default values when no parameters provided', function () {
        useTopPostsStatsWithRange();

        expect(mockGetRangeDates).toHaveBeenCalledWith(30);
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2023-01-01',
                date_to: '2023-01-30',
                order: 'mrr desc'
            }
        });
    });

    it('uses provided range value', function () {
        useTopPostsStatsWithRange(7);

        expect(mockGetRangeDates).toHaveBeenCalledWith(7);
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2023-01-01',
                date_to: '2023-01-07',
                order: 'mrr desc'
            }
        });
    });

    it('uses provided larger range value', function () {
        useTopPostsStatsWithRange(90);

        expect(mockGetRangeDates).toHaveBeenCalledWith(90);
        expect(mockUseTopPostsStats).toHaveBeenCalledWith({
            searchParams: {
                date_from: '2023-01-01',
                date_to: '2023-04-01',
                order: 'mrr desc'
            }
        });
    });
}); 