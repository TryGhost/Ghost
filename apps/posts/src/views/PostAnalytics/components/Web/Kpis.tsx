import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import EmptyStatView from '../EmptyStatView';
import React, {useState} from 'react';
import {Card, CardContent, ChartConfig, ChartContainer, ChartTooltip, Recharts, Tabs, TabsList, formatDisplayDate, formatDuration, formatNumber, formatPercentage} from '@tryghost/shade';
import {KpiTabTrigger, KpiTabValue} from '../KpiTab';
import {calculateYAxisWidth, getYTicks} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

type KpiMetric = {
    dataKey: string;
    label: string;
    formatter: (value: number) => string;
};

const KPI_METRICS: Record<string, KpiMetric> = {
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
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const [currentTab, setCurrentTab] = useState('visits');

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: queryParams
    });

    const isLoading = isConfigLoading || loading;

    const currentMetric = KPI_METRICS[currentTab];

    const chartData = data?.map((item) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: item.date,
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    // Calculate KPI values
    const getKpiValues = () => {
        if (!data?.length) {
            return {visits: 0, views: 0, bounceRate: 0, duration: 0};
        }

        // Sum total KPI value from the trend, ponderating using sessions
        const _ponderatedKPIsTotal = (kpi: keyof typeof data[0]) => {
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

    const kpiValues = getKpiValues();

    const chartConfig = {
        value: {
            label: currentMetric.label
        }
    } satisfies ChartConfig;

    return (
        <>
            {isLoading ? 'Loading' :
                <>
                    {(data && data.length !== 0 && kpiValues.visits !== '0') ?
                        <Card>
                            <CardContent>
                                <Tabs defaultValue="visits" variant='underline'>
                                    <TabsList className="grid grid-cols-4 gap-5">
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
                                            <Recharts.LineChart
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
                                                    tickFormatter={formatDisplayDate}
                                                    tickLine={false}
                                                    tickMargin={8}
                                                    ticks={chartData && chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                                                />
                                                <Recharts.YAxis
                                                    axisLine={false}
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
                                                    ticks={getYTicks(chartData || [])}
                                                    width={calculateYAxisWidth(getYTicks(chartData || []), currentMetric.formatter)}
                                                />
                                                <ChartTooltip
                                                    content={<CustomTooltipContent />}
                                                    cursor={true}
                                                />
                                                <Recharts.Line
                                                    dataKey="value"
                                                    dot={false}
                                                    isAnimationActive={false}
                                                    stroke="hsl(var(--chart-1))"
                                                    strokeWidth={2}
                                                    type='bump'
                                                />
                                            </Recharts.LineChart>
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
