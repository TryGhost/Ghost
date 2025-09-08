import AudienceSelect, {getAudienceQueryParam} from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import React, {useState} from 'react';
import SourcesCard from './components/SourcesCard';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import TopContent from './components/TopContent';
import WebKPIs, {KpiDataItem} from './components/WebKPIs';
import {CampaignType, Card, CardContent, TabType, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {Navigate, useAppContext, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

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
    const {appSettings} = useAppContext();
    const [selectedTab, setSelectedTab] = useState<TabType>('sources');
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignType>('');
    
    // Check if UTM tracking is enabled in labs
    const utmTrackingEnabled = data?.labs?.utmTracking || false;

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
    const {data: kpiData, loading: kpiLoading} = useTinybirdQuery({
        endpoint: 'api_kpis',
        statsConfig,
        params
    });

    // Get top sources data
    const {data: sourcesData, loading: isSourcesLoading} = useTinybirdQuery({
        endpoint: 'api_top_sources',
        statsConfig,
        params
    });

    // Map campaign types to endpoints
    const campaignEndpointMap: Record<CampaignType, string> = {
        '': '',
        'UTM sources': 'api_top_utm_sources',
        'UTM mediums': 'api_top_utm_mediums',
        'UTM campaigns': 'api_top_utm_campaigns',
        'UTM contents': 'api_top_utm_contents',
        'UTM terms': 'api_top_utm_terms'
    };

    // Get UTM campaign data (only fetch when UTM is enabled, campaigns tab is selected, and a campaign is selected)
    const campaignEndpoint = selectedCampaign ? campaignEndpointMap[selectedCampaign] : '';
    const {data: utmData, loading: isUtmLoading} = useTinybirdQuery({
        endpoint: campaignEndpoint,
        statsConfig,
        params,
        enabled: utmTrackingEnabled && selectedTab === 'campaigns' && !!selectedCampaign
    });

    // Select and transform the appropriate data based on current view
    const displayData = React.useMemo(() => {
        // If we're viewing UTM campaigns, use and transform the UTM data
        if (selectedTab === 'campaigns' && selectedCampaign) {
            // If UTM data is still loading or undefined, return null
            if (!utmData) {
                return null;
            }
            
            // Map UTM field names to the generic key name
            const utmKeyMap: Record<CampaignType, string> = {
                '': '',
                'UTM sources': 'utm_source',
                'UTM mediums': 'utm_medium',
                'UTM campaigns': 'utm_campaign',
                'UTM contents': 'utm_content',
                'UTM terms': 'utm_term'
            };
            
            const utmKey = utmKeyMap[selectedCampaign];
            if (!utmKey) {
                return utmData;
            }
            
            // Transform the data to use 'source' as the key, omitting the original utm_* field
            return utmData.map((item: SourcesData) => {
                const {[utmKey]: utmValue, ...rest} = item as Record<string, unknown>;
                return {
                    ...rest,
                    source: String(utmValue || '(not set)')
                };
            });
        }
        
        // Default to regular sources data
        return sourcesData;
    }, [sourcesData, utmData, selectedTab, selectedCampaign]);

    // Get total visitors for table
    const totalVisitors = kpiData?.length ? kpiData.reduce((sum, item) => sum + Number(item.visits), 0) : 0;

    // Calculate combined loading state
    const isPageLoading = isConfigLoading;

    if (!appSettings?.analytics.webAnalytics) {
        return (
            <Navigate to='/' />
        );
    }

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
                <div className='flex min-h-[460px] grid-cols-2 flex-col gap-8 lg:grid'>
                    <TopContent
                        range={range}
                        totalVisitors={totalVisitors}
                    />
                    <SourcesCard
                        data={displayData as SourcesData[] | null}
                        defaultSourceIconUrl={STATS_DEFAULT_SOURCE_ICON_URL}
                        isLoading={selectedTab === 'campaigns' ? isUtmLoading : isSourcesLoading}
                        range={range}
                        selectedCampaign={selectedCampaign}
                        selectedTab={selectedTab}
                        siteIcon={siteIcon}
                        siteUrl={siteUrl}
                        totalVisitors={totalVisitors}
                        utmTrackingEnabled={utmTrackingEnabled}
                        onCampaignChange={setSelectedCampaign}
                        onTabChange={setSelectedTab}
                    />
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
