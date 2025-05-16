import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import React, {useMemo} from 'react';
import {BarChartLoadingIndicator, ChartConfig, ChartContainer, ChartTooltip, Recharts, formatDisplayDate, formatNumber, formatQueryDate} from '@tryghost/shade';
import {KPI_METRICS} from '../../Web/components/Kpis';
import {STATS_RANGES} from '@src/utils/constants';
import {calculateYAxisWidth, getRangeDates, getYTicks} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken, useParams} from '@tryghost/admin-x-framework';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

const WebOverview:React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const currentMetric = KPI_METRICS.visits;
    const {postId} = useParams();

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid'
        }
    });

    const {startDate, endDate, timezone} = getRangeDates(STATS_RANGES.ALL_TIME.value);

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

    const chartData = data?.map((item) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: item.date,
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    const isLoading = isConfigLoading || loading;

    return (
        <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
            {isLoading ?
                <div className='flex min-h-[250px] items-center justify-center'>
                    <BarChartLoadingIndicator />
                </div>
                :
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
                                return formatNumber(value);
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
    );
};

export default WebOverview;