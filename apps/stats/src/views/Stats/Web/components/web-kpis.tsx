import {BarChartLoadingIndicator, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, GhAreaChart, KpiDropdownButton, KpiTabTrigger, KpiTabValue, Tabs, TabsList, formatDuration, formatNumber, formatPercentage, getYRange} from '@tryghost/shade';
import {KPI_METRICS} from '../web';
import {STATS_RANGES} from '@src/utils/constants';
import {sanitizeChartData, truncateLeadingEmptyData} from '@src/utils/chart-helpers';
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
    const currentMetric = KPI_METRICS[currentTab];

    const chartData = useMemo(() => {
        if (!data) {
            return [];
        }

        const sanitizedData = sanitizeChartData<KpiDataItem>(data, range, currentMetric.dataKey as keyof KpiDataItem, 'sum')?.map((item: KpiDataItem) => {
            const value = Number(item[currentMetric.dataKey]);
            return {
                date: String(item.date),
                value,
                formattedValue: currentMetric.formatter(value),
                label: currentMetric.label
            };
        }) || [];

        // For "all time" range, truncate leading empty data points after aggregation
        // This works around api_kpis returning zeros for dates before the site had data
        if (range === STATS_RANGES.allTime.value) {
            return truncateLeadingEmptyData(sanitizedData);
        }

        return sanitizedData;
    }, [data, range, currentMetric]);

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
        <Tabs data-testid='web-graph' defaultValue="visits" variant='kpis'>
            <TabsList className="-mx-6 hidden grid-cols-2 md:!visible md:!grid">
                <KpiTabTrigger value="visits" onClick={() => setCurrentTab('visits')}>
                    <KpiTabValue color='hsl(var(--chart-blue))' label="Unique visitors" value={kpiValues.visits} />
                </KpiTabTrigger>
                <KpiTabTrigger value="views" onClick={() => setCurrentTab('views')}>
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
                    color={currentMetric.chartColor}
                    data={chartData}
                    id="mrr"
                    range={range}
                    showHours={true}
                    yAxisRange={[0, getYRange(chartData).max]}
                />
            </div>
        </Tabs>
    );
};

export default WebKPIs;
