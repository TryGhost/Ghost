import {describe, expect, it} from 'vitest';
import {getWebKpiValues} from '@src/utils/kpi-helpers';

describe('kpi-helpers', () => {
    describe('getWebKpiValues', () => {
        it('handles missing data gracefully', () => {
            expect(getWebKpiValues(null)).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
            expect(getWebKpiValues(undefined)).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
            expect(getWebKpiValues([])).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
        });

        it('calculates accurate KPI aggregations', () => {
            const data = [
                {visits: 100, pageviews: 200, bounce_rate: 0.5, avg_session_sec: 60, date: '2023-01-01'},
                {visits: 150, pageviews: 300, bounce_rate: 0.4, avg_session_sec: 120, date: '2023-01-02'}
            ];
            expect(getWebKpiValues(data)).toEqual({visits: '250', views: '500', bounceRate: '44%', duration: '1m 36s'});
        });

        it('handles invalid data types safely', () => {
            const data = [
                {visits: 'NaN', pageviews: 'NaN', bounce_rate: 'NaN', avg_session_sec: 'NaN', date: '2023-01-01'}
            ];
            expect(getWebKpiValues(data)).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
        });

        it('provides accurate weighted bounce rate calculations', () => {
            const data = [
                {visits: 100, pageviews: 200, bounce_rate: 0.8, avg_session_sec: 30, date: '2023-01-01'},
                {visits: 400, pageviews: 800, bounce_rate: 0.2, avg_session_sec: 180, date: '2023-01-02'}
            ];
            
            const result = getWebKpiValues(data);
            expect(result.visits).toBe('500');
            expect(result.views).toBe('1,000');
            expect(result.bounceRate).toBe('32%'); // Weighted average: (0.8*100 + 0.2*400) / 500 = 0.32
        });

        it('handles zero visits without division errors', () => {
            const data = [
                {visits: 0, pageviews: 0, bounce_rate: 0.5, avg_session_sec: 60, date: '2023-01-01'},
                {visits: 0, pageviews: 0, bounce_rate: 0.4, avg_session_sec: 120, date: '2023-01-02'}
            ];
            
            const result = getWebKpiValues(data);
            expect(result.visits).toBe('0');
            expect(result.views).toBe('0');
            expect(result.bounceRate).toBe('0%');
            expect(result.duration).toBe('0s');
        });

        it('formats large numbers correctly', () => {
            const data = [
                {visits: 50000, pageviews: 125000, bounce_rate: 0.25, avg_session_sec: 300, date: '2023-01-01'}
            ];
            
            const result = getWebKpiValues(data);
            expect(result.visits).toBe('50,000');
            expect(result.views).toBe('125,000');
            expect(result.bounceRate).toBe('25%');
            expect(result.duration).toBe('5m 0s');
        });

        it('handles mixed data types in real-world scenarios', () => {
            const data = [
                {visits: '100', pageviews: 200, bounce_rate: '0.5', avg_session_sec: 60, date: '2023-01-01'},
                {visits: 150, pageviews: '300', bounce_rate: 0.4, avg_session_sec: '120', date: '2023-01-02'}
            ];
            
            const result = getWebKpiValues(data);
            expect(result.visits).toBe('250');
            expect(result.views).toBe('500');
            expect(result.bounceRate).toBe('44%');
            expect(result.duration).toBe('1m 36s');
        });

        it('handles complex duration formatting scenarios', () => {
            const testCases = [
                {duration: 30, expected: '30s'},
                {duration: 90, expected: '1m 30s'},
                {duration: 3600, expected: '1h 0m 0s'},
                {duration: 3661, expected: '1h 1m 1s'},
                {duration: 0, expected: '0s'}
            ];
            
            testCases.forEach(({duration, expected}) => {
                const data = [{visits: 100, pageviews: 200, bounce_rate: 0.5, avg_session_sec: duration, date: '2023-01-01'}];
                const result = getWebKpiValues(data);
                expect(result.duration).toBe(expected);
            });
        });

        it('maintains precision in percentage calculations', () => {
            const data = [
                {visits: 333, pageviews: 666, bounce_rate: 0.333333, avg_session_sec: 66.666, date: '2023-01-01'}
            ];
            
            const result = getWebKpiValues(data);
            expect(result.bounceRate).toBe('33%'); // Should round appropriately
        });

        it('handles single data point correctly', () => {
            const data = [
                {visits: 42, pageviews: 84, bounce_rate: 0.33, avg_session_sec: 127, date: '2023-01-01'}
            ];
            
            const result = getWebKpiValues(data);
            expect(result.visits).toBe('42');
            expect(result.views).toBe('84');
            expect(result.bounceRate).toBe('33%');
            expect(result.duration).toBe('2m 7s');
        });
    });
});