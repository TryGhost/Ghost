import {formatDuration, formatNumber, formatPercentage} from '@tryghost/shade/utils';
import {type KpiMetric} from '@/shared/analytics/kpi';

export const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visitors',
        color: 'var(--chart-blue)',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        color: 'var(--chart-teal)',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        color: 'var(--chart-purple)',
        formatter: formatPercentage
    },
    duration: {
        dataKey: 'avg_session_sec',
        label: 'Time on page',
        color: 'var(--chart-orange)',
        formatter: formatDuration
    }
};
