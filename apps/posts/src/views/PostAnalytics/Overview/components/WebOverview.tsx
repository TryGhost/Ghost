import React, {useMemo} from 'react';
import {AlignedAxisTick, BarChartLoadingIndicator, ChartConfig, ChartContainer, ChartTooltip, DateTooltipContent, Recharts, calculateYAxisWidth, formatDisplayDateWithRange, formatNumber, formatQueryDate, getRangeDates, getYRange, sanitizeChartData} from '@tryghost/shade';
import {KPI_METRICS} from '../../Web/components/Kpis';
import {KpiDataItem} from '@src/utils/kpi-helpers';
import {STATS_RANGES} from '@src/utils/constants';
import {getStatEndpointUrl, getToken, useParams} from '@tryghost/admin-x-framework';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useQuery} from '@tinybirdco/charts';

const WebOverview:React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const currentMetric = KPI_METRICS.visits;
    const {postId} = useParams();
    const range = STATS_RANGES.ALL_TIME.value;

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid'
        }
    });

    const {startDate, endDate, timezone} = getRangeDates(range);

    const params = useMemo(() => {
        const baseParams = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            timezone: timezone,
            post_uuid: ''
        };

        if (!isPostLoading && post?.uuid) {
            return {
                ...baseParams,
                post_uuid: post.uuid
            };
        }

        return baseParams;
    }, [isPostLoading, post, statsConfig?.id, startDate, endDate, timezone]);

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: params
    });

    const chartConfig = {
        value: {
            label: currentMetric.label
        }
    } satisfies ChartConfig;

    const chartData = sanitizeChartData<KpiDataItem>(data as KpiDataItem[] || [], range, currentMetric.dataKey as keyof KpiDataItem, 'sum')?.map((item: KpiDataItem) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: String(item.date),
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    const isLoading = isConfigLoading || loading;

    const yRange = [getYRange(chartData).min, getYRange(chartData).max];

    return (
        <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
            {isLoading ?
                <div className='flex min-h-[250px] items-center justify-center'>
                    <BarChartLoadingIndicator />
                </div>
                :
                <ChartContainer className='-mb-3 h-[16vw] max-h-[320px] w-full' config={chartConfig}>
                    <Recharts.AreaChart
                        data={chartData}
                        margin={{
                            left: 0,
                            right: 20,
                            top: 12
                        }}
                    >
                        <Recharts.CartesianGrid horizontal={false} vertical={false} />
                        <Recharts.XAxis
                            axisLine={false}
                            dataKey="date"
                            interval={0}
                            tick={props => <AlignedAxisTick {...props} formatter={value => formatDisplayDateWithRange(value, range)} />}
                            tickFormatter={(value) => {
                                return formatDisplayDateWithRange(value, range);
                            }}
                            tickLine={false}
                            tickMargin={8}
                            ticks={chartData && chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                        />
                        <Recharts.YAxis
                            axisLine={false}
                            domain={yRange}
                            scale="linear"
                            tickFormatter={(value) => {
                                return formatNumber(value);
                            }}
                            tickLine={false}
                            ticks={yRange}
                            width={calculateYAxisWidth(yRange, currentMetric.formatter)}
                        />
                        <ChartTooltip
                            content={<DateTooltipContent range={range} />}
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
            }
        </div>
    );
};

export default WebOverview;
