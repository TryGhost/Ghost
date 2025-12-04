import React, {useMemo, useState} from 'react';
import {Card, CardContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, GhAreaChart, type GhAreaChartSeries, KpiDropdownButton, KpiTabTrigger, KpiTabValue, Tabs, TabsList, formatDuration, formatNumber, formatPercentage, sanitizeChartData} from '@tryghost/shade';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';
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
    range: number;
}

const Kpis:React.FC<KpisProps> = ({data, range}) => {
    const [searchParams] = useSearchParams();
    const initialTab = searchParams.get('tab') || 'visits';
    const [currentTab, setCurrentTab] = useState(initialTab);

    // Prepare multi-series chart data
    const chartData = useMemo(() => {
        if (!data) {
            return [];
        }

        // Sanitize both series
        const visitsData = sanitizeChartData<KpiDataItem>(data as KpiDataItem[] || [], range, 'visits' as keyof KpiDataItem, 'sum');
        const pageviewsData = sanitizeChartData<KpiDataItem>(data as KpiDataItem[] || [], range, 'pageviews' as keyof KpiDataItem, 'sum');

        // Combine into single dataset with both series
        return visitsData?.map((item: KpiDataItem, index: number) => {
            return {
                date: String(item.date),
                value: 0, // Not used in multi-series mode
                formattedValue: '',
                label: '',
                visits: Number(item.visits),
                pageviews: Number(pageviewsData?.[index]?.pageviews || 0)
            };
        }) || [];
    }, [data, range]);

    // Define series configuration
    const series: GhAreaChartSeries[] = [
        {
            dataKey: 'visits',
            label: 'Unique visitors',
            color: 'hsl(var(--chart-blue))'
        },
        {
            dataKey: 'pageviews',
            label: 'Total views',
            color: 'hsl(var(--chart-teal))'
        }
    ];

    const kpiValues = getWebKpiValues(data as unknown as KpiDataItem[] | null);

    return (
        <Card>
            <CardContent>
                <Tabs variant='kpis'>
                    <TabsList className="-mx-6 hidden grid-cols-2 md:!visible md:!grid">
                        <KpiTabTrigger className='!opacity-100' value="visits" disabled>
                            <KpiTabValue color={KPI_METRICS.visits.color} label="Unique visitors" value={kpiValues.visits} />
                        </KpiTabTrigger>
                        <KpiTabTrigger className='!opacity-100' value="views" disabled>
                            <KpiTabValue color={KPI_METRICS.views.color} label="Total views" value={kpiValues.views} />
                        </KpiTabTrigger>
                    </TabsList>
                    <DropdownMenu>
                        <DropdownMenuTrigger className='md:hidden' asChild>
                            <KpiDropdownButton>
                                {currentTab === 'visits' &&
                                    <KpiTabValue color='hsl(var(--chart-blue))' label="Unique visitors" value={kpiValues.visits} />
                                }
                                {currentTab === 'views' &&
                                    <KpiTabValue color='hsl(var(--chart-teal))' label="Total views" value={kpiValues.views} />
                                }
                            </KpiDropdownButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className="w-56">
                            <DropdownMenuItem onClick={() => setCurrentTab('visits')}>Unique visitors</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCurrentTab('views')}>Total views</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                        <GhAreaChart
                            className={'-mb-3 aspect-auto h-[16vw] max-h-[320px] min-h-[180px] w-full'}
                            data={chartData}
                            id="post-web-kpis"
                            range={range}
                            series={series}
                            showHours={true}
                            syncId="overview-charts"
                        />
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
};

export default Kpis;
