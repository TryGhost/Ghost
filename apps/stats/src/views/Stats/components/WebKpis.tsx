import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import React, {useState} from 'react';
import {ChartConfig, ChartContainer, ChartTooltip, Recharts, Tabs, TabsList} from '@tryghost/shade';
import {KpiTabTrigger, KpiTabValue} from './KpiTab';
import {calculateYAxisWidth, getRangeDates, getYTicks} from '@src/utils/chart-helpers';
import {formatDisplayDate, formatDuration, formatNumber, formatPercentage, formatQueryDate} from '@src/utils/data-formatters';
import {getAudienceQueryParam} from './AudienceSelect';
import {getStatEndpointUrl} from '@src/config/stats-config';
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
        label: 'Visits',
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
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        formatter: formatDuration
    }
};

const WebKpis:React.FC = ({}) => {
    const {data: configData, isLoading: isConfigLoading} = useGlobalData();
    const [currentTab, setCurrentTab] = useState('visits');
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const params = {
        site_uuid: configData?.config.stats?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(configData?.config.stats?.endpoint, 'api_kpis'),
        token: configData?.config.stats?.token || '',
        params
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
                <KpiTabTrigger value="visit-duration" onClick={() => {
                    setCurrentTab('visit-duration');
                }}>
                    <KpiTabValue label="Avg. visit duration" value={kpiValues.duration} />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 min-h-[15vw]'>
                {isLoading ? 'Loading' :
                    <ChartContainer className='-mb-3 max-h-[15vw] min-h-[260px] w-full' config={chartConfig}>
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
                                    case 'visit-duration':
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
                }
            </div>
        </Tabs>
    );
};

export default WebKpis;
