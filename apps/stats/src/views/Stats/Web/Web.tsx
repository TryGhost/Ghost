import AudienceSelect from '../components/AudienceSelect';
import DateRangeSelect from '../components/DateRangeSelect';
import React from 'react';
import SourcesCard from './components/SourcesCard';
import StatsHeader from '../layout/StatsHeader';
import StatsLayout from '../layout/StatsLayout';
import StatsView from '../layout/StatsView';
import TopContent from './components/TopContent';
import WebKPIs, {KpiDataItem} from './components/WebKPIs';
import {Card, CardContent} from '@tryghost/shade';
import {Navigate, useAppContext} from '@tryghost/admin-x-framework';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {SourcesData, useWebData} from './hooks/useWebData';

const Web: React.FC = () => {
    const {appSettings} = useAppContext();
    const {
        kpiData,
        sourcesData,
        siteInfo,
        totalVisitors,
        range,
        kpiLoading,
        isSourcesLoading,
        isPageLoading
    } = useWebData();

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
                <div className='grid min-h-[460px] grid-cols-2 gap-8'>
                    <TopContent
                        range={range}
                    />
                    <SourcesCard
                        data={sourcesData as SourcesData[] | null}
                        defaultSourceIconUrl={STATS_DEFAULT_SOURCE_ICON_URL}
                        isLoading={isSourcesLoading}
                        range={range}
                        siteIcon={siteInfo.icon}
                        siteUrl={siteInfo.url}
                        totalVisitors={totalVisitors}
                    />
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
