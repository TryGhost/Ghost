import React, {useState} from 'react';
import {Card, CardContent, GhAreaChart, KpiTabTrigger, KpiTabValue, Tabs, TabsList, formatDuration, formatNumber, formatPercentage, sanitizeChartData} from '@tryghost/shade';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useSearchParams} from '@tryghost/admin-x-framework';

export type KpiMetric = {
    dataKey: string;
    label: string;
    color?: string;
    formatter: (value: number) => string;
};

export const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visitors',
        color: 'hsl(var(--chart-blue))',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        color: 'hsl(var(--chart-teal))',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        color: 'hsl(var(--chart-purple))',
        formatter: formatPercentage
    },
    duration: {
        dataKey: 'avg_session_sec',
        label: 'Time on page',
        color: 'hsl(var(--chart-orange))',
        formatter: formatDuration
    }
};

interface KpisProps {
    data: KpiDataItem[] | null | undefined;
}

const Kpis:React.FC<KpisProps> = ({data}) => {
    const {range} = useGlobalData();
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'visits';
    const [currentTab, setCurrentTab] = useState(initialTab);

    const currentMetric = KPI_METRICS[currentTab];

    const chartData = sanitizeChartData<KpiDataItem>(data as KpiDataItem[] || [], range, currentMetric.dataKey as keyof KpiDataItem, 'sum')?.map((item: KpiDataItem) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: String(item.date),
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    const kpiValues = getWebKpiValues(data as unknown as KpiDataItem[] | null);

    return (
        <Card>
            <CardContent>
                <Tabs defaultValue={currentTab} variant='kpis'>
                    <TabsList className="-mx-6 grid grid-cols-2">
                        <KpiTabTrigger value="visits" onClick={() => {
                            setCurrentTab('visits');
                        }}>
                            <KpiTabValue color={KPI_METRICS.visits.color} label="Unique visitors" value={kpiValues.visits} />
                        </KpiTabTrigger>
                        <KpiTabTrigger value="views" onClick={() => {
                            setCurrentTab('views');
                        }}>
                            <KpiTabValue color={KPI_METRICS.views.color} label="Total views" value={kpiValues.views} />
                        </KpiTabTrigger>
                    </TabsList>
                    <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                        <GhAreaChart
                            className={'-mb-3 h-[16vw] max-h-[320px] w-full'}
                            color={currentMetric.color}
                            data={chartData}
                            id={currentMetric.dataKey}
                            range={range}
                            syncId="overview-charts"
                        />
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default Kpis;
