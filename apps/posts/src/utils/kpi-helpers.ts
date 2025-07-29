import {formatDuration, formatNumber, formatPercentage} from '@tryghost/shade';

export type KpiDataItem = {
    visits: number | string;
    pageviews: number | string;
    bounce_rate: number | string;
    avg_session_sec: number | string;
    date: string;
    [key: string]: number | string;
};

export const getWebKpiValues = (data: KpiDataItem[] | null | undefined) => {
    if (!data?.length) {
        return {visits: '0', views: '0', bounceRate: '0%', duration: '0s'};
    }

    // Convert data values to numbers and handle NaN values safely
    const safeNumber = (value: string | number | null | undefined): number => {
        const parsed = Number(value);
        return isNaN(parsed) ? 0 : parsed;
    };

    const totalVisits = data.reduce((sum, item) => sum + safeNumber(item.visits), 0);
    const totalViews = data.reduce((sum, item) => sum + safeNumber(item.pageviews), 0);
    
    // Sum total KPI value from the trend, weighting using sessions
    const _weightedKPIsTotal = (kpi: keyof KpiDataItem) => {
        if (totalVisits === 0) {
            return 0;
        }
        return data.reduce((prev, curr) => {
            const currValue = safeNumber(curr[kpi]);
            const currVisits = safeNumber(curr.visits);
            return prev + (currValue * currVisits / totalVisits);
        }, 0);
    };

    const avgBounceRate = _weightedKPIsTotal('bounce_rate');
    const avgDuration = _weightedKPIsTotal('avg_session_sec');

    return {
        visits: formatNumber(totalVisits),
        views: formatNumber(totalViews),
        bounceRate: formatPercentage(avgBounceRate),
        duration: formatDuration(avgDuration)
    };
};
