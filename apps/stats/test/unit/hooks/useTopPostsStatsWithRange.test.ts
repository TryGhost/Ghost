import {getRangeDates} from '../../../src/hooks/useGrowthStats';
import {useTopPostsStats} from '@tryghost/admin-x-framework/api/stats';
import {useTopPostsStatsWithRange} from '../../../src/hooks/useTopPostsStatsWithRange';
import {vi} from 'vitest';

// Mock the dependent hooks and functions
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useTopPostsStats: vi.fn().mockReturnValue({isLoading: false, data: []})
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
        useMemo: function (fn) { 
            return fn(); 
        }
    };
});

describe('useTopPostsStatsWithRange', function () {
    // Setup type for mocked functions
    const mockUseTopPostsStats = useTopPostsStats as unknown as vi.MockedFunction<typeof useTopPostsStats>;
    const mockGetRangeDates = getRangeDates as unknown as vi.MockedFunction<typeof getRangeDates>;

    beforeEach(function () {
        vi.resetAllMocks();
        
        // Setup mock for getRangeDates with appropriate return values
        mockGetRangeDates.mockImplementation(function (range) {
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