import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import EmptyStatView from '../../components/EmptyStatView';
import React, {useState} from 'react';
import {AlignedAxisTick, Card, CardContent, ChartConfig, ChartContainer, ChartTooltip, KpiTabTrigger, KpiTabValue, Recharts, Tabs, TabsList, calculateYAxisWidth, formatDisplayDate, formatDuration, formatNumber, formatPercentage, getYRange, sanitizeChartData} from '@tryghost/shade';
import {KpiDataItem, getWebKpiValues} from '@src/utils/kpi-helpers';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useQuery} from '@tinybirdco/charts';

export type KpiMetric = {
    dataKey: string;
    label: string;
    formatter: (value: number) => string;
};

export const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visitors',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        formatter: formatPercentage
    },
    duration: {
        dataKey: 'avg_session_sec',
        label: 'Time on page',
        formatter: formatDuration
    }
};

interface KpisProps {
    queryParams: Record<string, string | number>
}

const Kpis:React.FC<KpisProps> = ({queryParams}) => {
    const {statsConfig, isLoading: isConfigLoading, range} = useGlobalData();
    const [currentTab, setCurrentTab] = useState('visits');

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: queryParams
    });

    const isLoading = isConfigLoading || loading;

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

    const chartConfig = {
        value: {
            label: currentMetric.label
        }
    } satisfies ChartConfig;

    const yRange = [getYRange(chartData).min, getYRange(chartData).max];

    return (
        <>
            {isLoading ? '' :
                <>
                    {(data && data.length !== 0 && kpiValues.visits !== '0') ?
                        <Card>
                            <CardContent>
                                <Tabs defaultValue="visits" variant='kpis'>
                                    <TabsList className="-mx-6 grid grid-cols-2">
                                        <KpiTabTrigger value="visits" onClick={() => {
                                            setCurrentTab('visits');
                                        }}>
                                            <KpiTabValue label="Unique visitors" value={kpiValues.visits} />
                                        </KpiTabTrigger>
                                        <KpiTabTrigger value="views" onClick={() => {
                                            setCurrentTab('views');
                                        }}>
                                            <KpiTabValue label="Total views" value={kpiValues.views} />
                                        </KpiTabTrigger>
                                    </TabsList>
                                    <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                                        <ChartContainer className='-mb-3 h-[16vw] max-h-[320px] w-full' config={chartConfig}>
                                            <Recharts.AreaChart
                                                data={chartData}
                                                margin={{
                                                    left: 0,
                                                    right: 20,
                                                    top: 12
                                                }}
                                                accessibilityLayer
                                            >
                                                <Recharts.CartesianGrid horizontal={false} vertical={false} />
                                                <Recharts.XAxis
                                                    axisLine={false}
                                                    dataKey="date"
                                                    interval={0}
                                                    tick={props => <AlignedAxisTick {...props} formatter={formatDisplayDate} />}
                                                    tickFormatter={formatDisplayDate}
                                                    tickLine={false}
                                                    tickMargin={8}
                                                    ticks={chartData && chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                                                />
                                                <Recharts.YAxis
                                                    axisLine={false}
                                                    domain={yRange}
                                                    scale="linear"
                                                    tickFormatter={(value) => {
                                                        switch (currentTab) {
                                                        case 'bounce-rate':
                                                            return formatPercentage(value);
                                                        case 'duration':
                                                            return formatDuration(value);
                                                        case 'visits':
                                                        case 'views':
                                                            return formatNumber(value);
                                                        default:
                                                            return value.toLocaleString();
                                                        }
                                                    }}
                                                    tickLine={false}
                                                    ticks={yRange}
                                                    width={calculateYAxisWidth(yRange, currentMetric.formatter)}
                                                />
                                                <ChartTooltip
                                                    content={<CustomTooltipContent />}
                                                    cursor={true}
                                                    isAnimationActive={false}
                                                    position={{y: 20}}
                                                />
                                                <defs>
                                                    <linearGradient id="fillChart" x1="0" x2="0" y1="0" y2="1">
                                                        <stop
                                                            offset="5%"
                                                            stopColor="hsl(var(--chart-blue))"
                                                            stopOpacity={0.8}
                                                        />
                                                        <stop
                                                            offset="95%"
                                                            stopColor="hsl(var(--chart-blue))"
                                                            stopOpacity={0.1}
                                                        />
                                                    </linearGradient>
                                                </defs>
                                                <Recharts.Area
                                                    dataKey="value"
                                                    fill="url(#fillChart)"
                                                    fillOpacity={0.2}
                                                    isAnimationActive={false}
                                                    stackId="a"
                                                    stroke="hsl(var(--chart-blue))"
                                                    strokeWidth={2}
                                                    type="linear"
                                                />
                                            </Recharts.AreaChart>
                                        </ChartContainer>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>
                        :
                        <div className='mt-10 grow'>
                            <EmptyStatView />
                        </div>
                    }
                </>
            }
        </>
    );
};

export default Kpis;
