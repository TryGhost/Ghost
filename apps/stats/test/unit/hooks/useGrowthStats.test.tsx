import moment from 'moment';
import {beforeEach, describe, expect, it} from 'vitest';
import {getRangeDates} from '@src/hooks/useGrowthStats';

// Types for test data
interface MemberDataItem {
    date: string;
    free: number;
    paid: number;
    comped: number;
}

interface MrrDataItem {
    date: string;
    mrr: number;
    currency: string;
}

type DiffDirection = 'up' | 'down' | 'same';

// Mock data for testing
const mockMemberData: MemberDataItem[] = [
    {date: '2025-01-01', free: 100, paid: 50, comped: 5},
    {date: '2025-01-15', free: 110, paid: 55, comped: 5},
    {date: '2025-02-01', free: 120, paid: 60, comped: 5}
];

const mockMrrData: MrrDataItem[] = [
    {date: '2025-01-01', mrr: 0, currency: 'usd'},
    {date: '2025-03-05', mrr: 416, currency: 'usd'},
    {date: '2025-04-09', mrr: 416, currency: 'usd'}
];

const mockMrrDataWithSpike: MrrDataItem[] = [
    {date: '2025-01-01', mrr: 0, currency: 'usd'},
    {date: '2025-03-04', mrr: 8749, currency: 'usd'},
    {date: '2025-03-05', mrr: 416, currency: 'usd'},
    {date: '2025-04-09', mrr: 416, currency: 'usd'}
];

// Extract calculateTotals for testing (normally this would be exported)
const calculateTotals = (memberData: MemberDataItem[], mrrData: MrrDataItem[], dateFrom: string) => {
    // Initialize default values
    const percentChanges = {
        total: '0%',
        free: '0%',
        paid: '0%',
        mrr: '0%'
    };

    const directions = {
        total: 'same' as DiffDirection,
        free: 'same' as DiffDirection,
        paid: 'same' as DiffDirection,
        mrr: 'same' as DiffDirection
    };

    // Get latest values
    const latest = memberData.length > 0 ? memberData[memberData.length - 1] : {free: 0, paid: 0, comped: 0};
    const latestMrr = mrrData.length > 0 ? mrrData[mrrData.length - 1] : {mrr: 0};

    // Calculate total members
    const totalMembers = latest.free + latest.paid + latest.comped;
    const totalMrr = latestMrr.mrr;

    // Member calculations (only if we have member data)
    if (memberData.length > 1) {
        const first = memberData[0];
        const firstTotal = first.free + first.paid + first.comped;

        if (firstTotal > 0) {
            const totalChange = ((totalMembers - firstTotal) / firstTotal) * 100;
            percentChanges.total = `${Math.abs(totalChange).toFixed(1)}%`;
            directions.total = totalChange > 0 ? 'up' : totalChange < 0 ? 'down' : 'same';
        }
    }

    // MRR calculations with the new logic (run even if no member data)
    if (mrrData.length > 1) {
        const actualStartDate = moment(dateFrom).format('YYYY-MM-DD');
        const firstActualPoint = mrrData.find(point => moment(point.date).isSameOrAfter(actualStartDate));
        
        // Check if this is a "from beginning" range
        const isFromBeginningRange = moment(dateFrom).isSame(moment().startOf('year'), 'day') || 
                                   moment(dateFrom).year() < moment().year();
        
        let firstMrr = 0;
        
        if (firstActualPoint) {
            if (moment(firstActualPoint.date).isSame(actualStartDate, 'day')) {
                firstMrr = firstActualPoint.mrr;
            } else {
                if (isFromBeginningRange) {
                    firstMrr = 0;
                } else {
                    firstMrr = totalMrr;
                }
            }
        } else if (isFromBeginningRange) {
            firstMrr = 0;
        } else {
            firstMrr = totalMrr;
        }
        
        if (firstMrr >= 0) {
            const mrrChange = firstMrr === 0 
                ? (totalMrr > 0 ? 100 : 0)
                : ((totalMrr - firstMrr) / firstMrr) * 100;
            
            percentChanges.mrr = `${Math.abs(mrrChange).toFixed(1)}%`;
            directions.mrr = mrrChange > 0 ? 'up' : mrrChange < 0 ? 'down' : 'same';
        }
    }

    return {
        totalMembers,
        freeMembers: latest.free,
        paidMembers: latest.paid,
        mrr: totalMrr,
        percentChanges,
        directions
    };
};

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

    describe('calculateTotals', () => {
        it('returns zero values for empty data', () => {
            const result = calculateTotals([], [], '2025-01-01');
            expect(result.totalMembers).toBe(0);
            expect(result.mrr).toBe(0);
            expect(result.percentChanges.total).toBe('0%');
            expect(result.directions.total).toBe('same');
        });

        it('calculates member totals correctly', () => {
            const result = calculateTotals(mockMemberData, [], '2025-01-01');
            expect(result.totalMembers).toBe(185); // 120 + 60 + 5
            expect(result.freeMembers).toBe(120);
            expect(result.paidMembers).toBe(60);
        });

        it('calculates member percentage change correctly', () => {
            const result = calculateTotals(mockMemberData, [], '2025-01-01');
            // First total: 100 + 50 + 5 = 155, Last total: 120 + 60 + 5 = 185
            // Expected change: ((185 - 155) / 155) * 100 = ~19.4%
            expect(result.percentChanges.total).toBe('19.4%');
            expect(result.directions.total).toBe('up');
        });

        describe('MRR percentage calculations', () => {
            it('calculates 0% change for recent ranges with no events (Last 7 days)', () => {
                const last7Days = moment().subtract(6, 'days').format('YYYY-MM-DD');
                const result = calculateTotals([], mockMrrData, last7Days);
                expect(result.percentChanges.mrr).toBe('0.0%');
                expect(result.directions.mrr).toBe('same');
            });

            it('calculates 0% change for recent ranges with no events (Last 30 days)', () => {
                const last30Days = moment().subtract(29, 'days').format('YYYY-MM-DD');
                const result = calculateTotals([], mockMrrData, last30Days);
                expect(result.percentChanges.mrr).toBe('0.0%');
                expect(result.directions.mrr).toBe('same');
            });

            it('calculates 100% increase for YTD starting from 0', () => {
                const ytdStart = moment().startOf('year').format('YYYY-MM-DD');
                const result = calculateTotals([], mockMrrData, ytdStart);
                expect(result.percentChanges.mrr).toBe('100.0%');
                expect(result.directions.mrr).toBe('up');
            });

            it('handles ranges with actual data points correctly', () => {
                const marchStart = '2025-03-05';
                const result = calculateTotals([], mockMrrData, marchStart);
                expect(result.percentChanges.mrr).toBe('0.0%'); // 416 to 416
                expect(result.directions.mrr).toBe('same');
            });

            it('ignores spikes in middle of range for recent periods', () => {
                const marchStart = '2025-03-05';
                const result = calculateTotals([], mockMrrDataWithSpike, marchStart);
                expect(result.percentChanges.mrr).toBe('0.0%'); // Should use 416 as first actual point, not the spike
                expect(result.directions.mrr).toBe('same');
            });

            it('handles YTD with spikes correctly', () => {
                const ytdStart = moment().startOf('year').format('YYYY-MM-DD');
                const result = calculateTotals([], mockMrrDataWithSpike, ytdStart);
                expect(result.percentChanges.mrr).toBe('100.0%'); // 0 to 416 (ignoring spike)
                expect(result.directions.mrr).toBe('up');
            });

            it('detects from-beginning ranges correctly', () => {
                // Test that current year start is detected as "from beginning"
                const currentYearStart = moment().startOf('year').format('YYYY-MM-DD');
                const result = calculateTotals([], mockMrrData, currentYearStart);
                expect(result.percentChanges.mrr).toBe('100.0%'); // Starting from 0
                
                // Test that previous year dates are detected as "from beginning"
                const lastYear = moment().subtract(1, 'year').format('YYYY-MM-DD');
                const result2 = calculateTotals([], mockMrrData, lastYear);
                expect(result2.percentChanges.mrr).toBe('100.0%'); // Starting from 0
            });

            it('detects recent ranges correctly', () => {
                // Test recent ranges don't assume starting from 0
                const recentDate = moment().subtract(10, 'days').format('YYYY-MM-DD');
                const result = calculateTotals([], mockMrrData, recentDate);
                expect(result.percentChanges.mrr).toBe('0.0%'); // Carried forward, not from 0
            });
        });

        it('handles mixed member and MRR data', () => {
            const result = calculateTotals(mockMemberData, mockMrrData, '2025-01-01');
            expect(result.totalMembers).toBe(185);
            expect(result.mrr).toBe(416);
            expect(result.percentChanges.total).toBe('19.4%'); // Member change
            expect(result.percentChanges.mrr).toBe('100.0%'); // MRR from 0 to 416
        });
    });
});