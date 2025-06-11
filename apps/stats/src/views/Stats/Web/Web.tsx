import AudienceSelect, {getAudienceQueryParam} from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import React from 'react';
import SourcesCard from './components/SourcesCard';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import TopContent from './components/TopContent';
import WebKPIs, {KpiDataItem} from './components/WebKPIs';
import {Card, CardContent, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

interface SourcesData {
    source?: string | number;
    visits?: number;
    [key: string]: unknown;
    percentage?: number;
}

export const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visitors',
        chartColor: 'hsl(var(--chart-blue))',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatPercentage
    },
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatDuration
    }
};

const Web: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading, range, audience, data} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Get site URL and icon for domain comparison and Direct traffic favicon
    const siteUrl = data?.url as string | undefined;
    const siteIcon = data?.icon as string | undefined;

    // Prepare query parameters
    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const queryParams: Record<string, string> = {
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        member_status: getAudienceQueryParam(audience)
    };

    if (timezone) {
        queryParams.timezone = timezone;
    }

    // Get KPI data
    const {data: kpiData, loading: kpiLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params
    });

    // Get top sources data
    const {data: sourcesData, loading: isSourcesLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params
    });

    // Get total visitors for table
    const totalVisitors = kpiData?.length ? kpiData.reduce((sum, item) => sum + Number(item.visits), 0) : 0;

    // Calculate combined loading state
    const isPageLoading = isConfigLoading;

    return (
        <StatsLayout>
            <StatsHeader>
                <AudienceSelect />
                <DateRangeSelect />
            </StatsHeader>
            <StatsView isLoading={isPageLoading} loadingComponent={<></>}>
                <Card>
                    <CardContent>
                        <WebKPIs
                            data={kpiData as KpiDataItem[] | null}
                            isLoading={kpiLoading}
                            range={range}
                        />
                    </CardContent>
                </Card>
                <div className='grid min-h-[460px] grid-cols-2 gap-8'>
                    <TopContent
                        range={range}
                    />
                    <SourcesCard
                        data={sourcesData as SourcesData[] | null}
                        defaultSourceIconUrl={STATS_DEFAULT_SOURCE_ICON_URL}
                        isLoading={isSourcesLoading}
                        range={range}
                        siteIcon={siteIcon}
                        siteUrl={siteUrl}
                        totalVisitors={totalVisitors}
                    />
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
