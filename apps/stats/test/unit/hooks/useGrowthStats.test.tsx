import {beforeEach, describe, expect, it} from 'vitest';
import {getRangeDates} from '@src/hooks/useGrowthStats';

describe('useGrowthStats', () => {
    beforeEach(() => {
        // Reset any global state if needed
    });

    describe('getRangeDates', () => {
        it('returns correct dates for today (1 day)', () => {
            const {dateFrom, endDate} = getRangeDates(1);
            expect(dateFrom).toBe(endDate);
        });

        it('returns correct dates for all time (1000 days)', () => {
            const {dateFrom} = getRangeDates(1000);
            expect(dateFrom).toBe('2010-01-01');
        });

        it('returns correct dates for year to date (-1)', () => {
            const {dateFrom} = getRangeDates(-1);
            const currentYear = new Date().getFullYear();
            expect(dateFrom).toBe(`${currentYear}-01-01`);
        });

        it('returns correct dates for specific range', () => {
            const {dateFrom, endDate} = getRangeDates(7);
            const start = new Date(dateFrom);
            const end = new Date(endDate);
            const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(6); // 7 days inclusive
        });

        it('handles negative ranges by using minimum of 1', () => {
            const {dateFrom, endDate} = getRangeDates(-5);
            const start = new Date(dateFrom);
            const end = new Date(endDate);
            const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(0); // Should be treated as 1 day
        });

        it('handles zero range by using minimum of 1', () => {
            const {dateFrom, endDate} = getRangeDates(0);
            const start = new Date(dateFrom);
            const end = new Date(endDate);
            const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            expect(diffInDays).toBe(0); // Should be treated as 1 day
        });

        it('returns dates in YYYY-MM-DD format', () => {
            const {dateFrom, endDate} = getRangeDates(30);
            expect(dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('returns end date as today in UTC', () => {
            const {endDate} = getRangeDates(7);
            const today = new Date().toISOString().split('T')[0];
            // Allow for timezone differences by checking if it's today or yesterday
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            expect([today, yesterday]).toContain(endDate);
        });
    });
});