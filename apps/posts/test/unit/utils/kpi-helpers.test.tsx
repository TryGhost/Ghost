import {describe, expect, it} from 'vitest';
import {getWebKpiValues} from '@src/utils/kpi-helpers';

describe('kpi-helpers', () => {
    describe('getWebKpiValues', () => {
        it('should return default values for null or undefined data', () => {
            expect(getWebKpiValues(null)).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
            expect(getWebKpiValues(undefined)).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
        });

        it('should return default values for empty data array', () => {
            expect(getWebKpiValues([])).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
        });

        it('should calculate correct KPI values', () => {
            const data = [
                {visits: 100, pageviews: 200, bounce_rate: 0.5, avg_session_sec: 60, date: '2023-01-01'},
                {visits: 150, pageviews: 300, bounce_rate: 0.4, avg_session_sec: 120, date: '2023-01-02'}
            ];
            expect(getWebKpiValues(data)).toEqual({visits: '250', views: '500', bounceRate: '44%', duration: '1m 36s'});
        });

        it('should handle NaN values gracefully', () => {
            const data = [
                {visits: 'NaN', pageviews: 'NaN', bounce_rate: 'NaN', avg_session_sec: 'NaN', date: '2023-01-01'}
            ];
            expect(getWebKpiValues(data)).toEqual({visits: '0', views: '0', bounceRate: '0%', duration: '0s'});
        });
    });
});