import {MockInstance, vi} from 'vitest';

/**
 * Date testing utilities to provide consistent, reliable date mocking
 * Addresses issues with timezone-dependent tests and timing-sensitive assertions
 */

// Fixed date for consistent testing
export const FIXED_DATE = new Date('2024-01-15T12:00:00.000Z');
export const FIXED_DATE_STRING = '2024-01-15';

/**
 * Mock system date to a fixed point in time
 * Prevents tests from failing due to timing issues across midnight
 */
export const mockSystemDate = (date: Date = FIXED_DATE): MockInstance => {
    const mockDate = vi.spyOn(Date, 'now').mockReturnValue(date.getTime());
    vi.setSystemTime(date);
    return mockDate;
};

/**
 * Restore system date to normal behavior
 */
export const restoreSystemDate = () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
};

/**
 * Calculate expected date range based on a fixed starting point
 * This replaces the fragile moment().subtract() pattern
 */
export const getExpectedDateRange = (days: number, baseDate: Date = FIXED_DATE) => {
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    
    return {
        expectedDateFrom: startDate.toISOString().split('T')[0], // YYYY-MM-DD format
        expectedDateTo: baseDate.toISOString().split('T')[0]
    };
};

/**
 * Create a date range for testing that spans specific days
 */
export const createDateRange = (startDaysAgo: number, endDaysAgo: number = 0, baseDate: Date = FIXED_DATE) => {
    const startDate = new Date(baseDate);
    const endDate = new Date(baseDate);
    
    startDate.setDate(startDate.getDate() - startDaysAgo);
    endDate.setDate(endDate.getDate() - endDaysAgo);
    
    return {
        startDate,
        endDate,
        startDateString: startDate.toISOString().split('T')[0],
        endDateString: endDate.toISOString().split('T')[0]
    };
};

/**
 * Mock the getRangeDates function from @tryghost/shade
 * Provides consistent date ranges for testing
 */
export const mockGetRangeDates = () => {
    return (range: number) => {
        const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(range);
        return {
            startDate: new Date(expectedDateFrom + 'T00:00:00.000Z'),
            endDate: new Date(expectedDateTo + 'T23:59:59.999Z'),
            timezone: 'UTC'
        };
    };
};

/**
 * Mock the formatQueryDate function from @tryghost/shade
 * Provides consistent date formatting
 */
export const mockFormatQueryDate = () => {
    return (date: Date) => date.toISOString().split('T')[0];
};

/**
 * Common date test scenarios
 */
export const DATE_TEST_SCENARIOS = {
    today: {range: 1, description: 'today'},
    lastWeek: {range: 7, description: 'last 7 days'},
    lastMonth: {range: 30, description: 'last 30 days'},
    last3Months: {range: 90, description: 'last 3 months'},
    yearToDate: {range: -1, description: 'year to date'}
} as const;

/**
 * Setup date mocking for hook tests
 * This should be called in beforeEach for hooks that use date functions
 */
export const setupDateMocking = () => {
    const mockDate = mockSystemDate();
    
    // Mock external date functions
    vi.mock('@tryghost/shade', async () => {
        const actual = await vi.importActual('@tryghost/shade') as Record<string, unknown>;
        return {
            ...actual,
            getRangeDates: vi.fn().mockImplementation(mockGetRangeDates()),
            formatQueryDate: vi.fn().mockImplementation(mockFormatQueryDate())
        };
    });
    
    return {
        mockDate,
        cleanup: restoreSystemDate
    };
};

/**
 * Test helper for date-dependent API calls
 * Verifies that API calls were made with expected date parameters
 */
export const expectApiCallWithDateRange = (
    mockApiCall: MockInstance,
    range: number,
    additionalParams: Record<string, unknown> = {}
) => {
    const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(range);
    
    expect(mockApiCall).toHaveBeenCalledWith({
        searchParams: {
            date_from: expectedDateFrom,
            date_to: expectedDateTo,
            ...additionalParams
        },
        enabled: expect.any(Boolean)
    });
};