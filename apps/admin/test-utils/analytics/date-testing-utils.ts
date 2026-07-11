import {type MockInstance, vi} from 'vitest';

/**
 * Date testing utilities to provide consistent, reliable date mocking
 * Addresses issues with timezone-dependent tests and timing-sensitive assertions
 */

// Fixed date for consistent testing
export const FIXED_DATE = new Date('2024-01-15T12:00:00.000Z');

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
 * Setup date mocking for hook tests
 * This should be called in beforeEach for hooks that use date functions
 */
export const setupDateMocking = () => {
    const mockDate = mockSystemDate();

    return {
        mockDate,
        cleanup: restoreSystemDate
    };
};
