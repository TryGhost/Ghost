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
        return {visits: 0, views: 0, bounceRate: 0, duration: 0};
    }

    // Sum total KPI value from the trend, ponderating using sessions
    const _ponderatedKPIsTotal = (kpi: keyof KpiDataItem) => {
        if (totalVisits === 0) {
            return 0;
        }
        return data.reduce((prev, curr) => {
            const currValue = Number(curr[kpi] ?? 0);
            const currVisits = Number(curr.visits);
            return prev + (currValue * currVisits / totalVisits);
        }, 0);
    };

    const totalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);
    const totalViews = data.reduce((sum, item) => sum + Number(item.pageviews), 0);
    const avgBounceRate = _ponderatedKPIsTotal('bounce_rate');
    const avgDuration = _ponderatedKPIsTotal('avg_session_sec');

    return {
        visits: formatNumber(totalVisits),
        views: formatNumber(totalViews),
        bounceRate: formatPercentage(avgBounceRate),
        duration: formatDuration(avgDuration)
    };
};
