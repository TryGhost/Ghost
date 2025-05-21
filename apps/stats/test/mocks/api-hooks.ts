import {vi} from 'vitest';

// Define a type for the getRangeDates return
type DateRange = {
    dateFrom: string;
    endDate: string;
};

// Define a type for mock options
type AdminXStatsMockOptions = {
    newsletterStats?: {isLoading: boolean; data: unknown};
    subscriberCount?: {isLoading: boolean; data: unknown};
    memberCountHistory?: {isLoading: boolean; data: unknown};
    mrrHistory?: {isLoading: boolean; data: unknown};
    topPostsStats?: {isLoading: boolean; data: unknown};
};

/**
 * Creates a mock for the useGrowthStats and getRangeDates functions
 * The getRangeDates mock is customizable with a callback function
 * 
 * @param getRangeDatesImpl - Optional custom implementation of getRangeDates
 * @example
 * // In your test file:
 * import {setupGrowthStatsMocks} from '../../../test/mocks/api-hooks';
 * 
 * // With default implementation
 * setupGrowthStatsMocks();
 * 
 * // With custom implementation
 * setupGrowthStatsMocks((range) => {
 *   if (range === 7) {
 *     return {dateFrom: '2023-01-01', endDate: '2023-01-07'};
 *   }
 *   // etc...
 * });
 */
export const setupGrowthStatsMocks = (
    getRangeDatesImpl = (range: number): DateRange => ({
        dateFrom: '2023-01-01',
        endDate: range === 7 ? '2023-01-07' : 
            range === 90 ? '2023-04-01' : 
                '2023-01-30'
    })
) => {
    vi.mock('../../../src/hooks/useGrowthStats', () => ({
        getRangeDates: vi.fn().mockImplementation(getRangeDatesImpl),
        useGrowthStats: vi.fn()
    }));
};

/**
 * Creates mocks for admin-x-framework API stats hooks
 * 
 * @example
 * // In your test file:
 * import {setupAdminXStatsMocks} from '../../../test/mocks/api-hooks';
 * 
 * // With default values
 * setupAdminXStatsMocks();
 * 
 * // With custom return values
 * setupAdminXStatsMocks({
 *   newsletterStats: {isLoading: false, data: [{id: '1'}]},
 *   subscriberCount: {isLoading: true, data: null}
 * });
 */
export const setupAdminXStatsMocks = (options: AdminXStatsMockOptions = {}) => {
    const {
        newsletterStats = {isLoading: false, data: []},
        subscriberCount = {isLoading: false, data: []},
        memberCountHistory = {isLoading: false, data: []},
        mrrHistory = {isLoading: false, data: []},
        topPostsStats = {isLoading: false, data: []}
    } = options;

    vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
        useNewsletterStats: vi.fn().mockReturnValue(newsletterStats),
        useSubscriberCount: vi.fn().mockReturnValue(subscriberCount),
        useMemberCountHistory: vi.fn().mockReturnValue(memberCountHistory),
        useMrrHistory: vi.fn().mockReturnValue(mrrHistory),
        useTopPostsStats: vi.fn().mockReturnValue(topPostsStats)
    }));
}; 