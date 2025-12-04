import {BarChartLoadingIndicator, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, GhAreaChart, type GhAreaChartSeries, KpiDropdownButton, KpiTabTrigger, KpiTabValue, Tabs, TabsList, formatDuration, formatNumber, formatPercentage} from '@tryghost/shade';
import {sanitizeChartData} from '@src/utils/chart-helpers';
import {useMemo, useState} from 'react';

export interface KpiDataItem {
    date: string;
    [key: string]: string | number;
}

interface WebKPIsProps {
    data: KpiDataItem[] | null;
    range: number;
    isLoading: boolean;
}

const WebKPIs: React.FC<WebKPIsProps> = ({data, range, isLoading}) => {
    const [currentTab, setCurrentTab] = useState('visits');

    // Prepare multi-series chart data
    const chartData = useMemo(() => {
        if (!data) {
            return [];
        }

        // Sanitize both series
        const visitsData = sanitizeChartData<KpiDataItem>(data, range, 'visits' as keyof KpiDataItem, 'sum');
        const pageviewsData = sanitizeChartData<KpiDataItem>(data, range, 'pageviews' as keyof KpiDataItem, 'sum');

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

    // Calculate KPI values
    const getKpiValues = () => {
        if (!data?.length) {
            return {visits: 0, views: 0, bounceRate: 0, duration: 0};
        }

        const totalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);
        const totalViews = data.reduce((sum, item) => sum + Number(item.pageviews), 0);

        // Ponderated KPIs calculation
        const _ponderatedKPIsTotal = (kpi: keyof typeof data[0]) => {
            return data.reduce((prev, curr) => {
                const currValue = Number(curr[kpi] ?? 0);
                const currVisits = Number(curr.visits);
                return prev + (currValue * currVisits / totalVisits);
            }, 0);
        };

        const avgBounceRate = _ponderatedKPIsTotal('bounce_rate');
        const avgDuration = _ponderatedKPIsTotal('avg_session_sec');

        return {
            visits: formatNumber(totalVisits),
            views: formatNumber(totalViews),
            bounceRate: formatPercentage(avgBounceRate),
            duration: formatDuration(avgDuration)
        };
    };

    const kpiValues = getKpiValues();

    if (isLoading) {
        return (
            <div className='-mb-6 flex h-[calc(16vw+132px)] w-full items-start justify-center'>
                <BarChartLoadingIndicator />
            </div>
        );
    }

    return (
        <Tabs data-testid='web-graph' variant='kpis'>
            <TabsList className="-mx-6 hidden grid-cols-2 md:!visible md:!grid">
                <KpiTabTrigger className='!opacity-100' value="visits" disabled>
                    <KpiTabValue color='hsl(var(--chart-blue))' label="Unique visitors" value={kpiValues.visits} />
                </KpiTabTrigger>
                <KpiTabTrigger className='!opacity-100' value="views" disabled>
                    <KpiTabValue color='hsl(var(--chart-teal))' label="Total views" value={kpiValues.views} />
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
                    className='-mb-3 h-[16vw] max-h-[320px] min-h-[180px] w-full'
                    data={chartData}
                    id="web-kpis"
                    range={range}
                    series={series}
                    showHours={true}
                />
            </div>
        </Tabs>
    );
};

export default WebKPIs;
