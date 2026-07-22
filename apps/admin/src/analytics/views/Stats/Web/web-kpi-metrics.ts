import {type KpiMetric} from '@/shared/analytics/kpi';
import {formatDuration, formatNumber, formatPercentage} from '@tryghost/shade/utils';

// Web analytics KPI metric definitions. Lives in its own module so the `web.tsx`
// route file only exports a component (satisfies react-refresh/only-export-components).
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
        color: 'var(--chart-teal)',
        formatter: formatPercentage
    },
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        color: 'var(--chart-teal)',
        formatter: formatDuration
    }
};
