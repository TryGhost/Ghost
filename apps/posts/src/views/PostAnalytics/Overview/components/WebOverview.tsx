import React, {useMemo} from 'react';
import {BarChartLoadingIndicator, GhAreaChart, formatQueryDate, getRangeDates, getRangeForStartDate, sanitizeChartData} from '@tryghost/shade';
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

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid'
        }
    });

    // Calculate range based on days between today and post publication date
    const range = useMemo(() => {
        if (!post?.published_at) {
            return STATS_RANGES.ALL_TIME.value; // Fallback if no publication date
        }
        const calculatedRange = getRangeForStartDate(post.published_at);
        return calculatedRange;
    }, [post?.published_at]);

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

    const chartData = sanitizeChartData<KpiDataItem>(data as KpiDataItem[] || [], range, currentMetric.dataKey as keyof KpiDataItem, 'sum')?.map((item: KpiDataItem) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: String(item.date),
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    const isLoading = isPostLoading || isConfigLoading || loading;

    return (
        <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
            {isLoading ?
                <div className='flex min-h-[250px] items-center justify-center'>
                    <BarChartLoadingIndicator />
                </div>
                :
                <GhAreaChart
                    className={'-mb-3 h-[16vw] max-h-[320px] w-full'}
                    color='hsl(var(--chart-blue))'
                    data={chartData}
                    id="visitors"
                    range={range}
                    syncId="overview-charts"
                />
            }
        </div>
    );
};

export default WebOverview;
