import AudienceSelect, {getAudienceQueryParam} from '../components/audience-select';
import DateRangeSelect from '../components/date-range-select';
import LocationsCard from './components/locations-card';
import React, {useMemo} from 'react';
import StatsHeader from '../layout/stats-header';
import StatsLayout from '../layout/stats-layout';
import StatsView from '../layout/stats-view';
import {Navigate, useAppContext, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {formatQueryDate, getRangeDates} from '@tryghost/shade';
import {useGlobalData} from '@src/providers/global-data-provider';

const Locations:React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {appSettings} = useAppContext();

    const params = useMemo(() => ({
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    }), [statsConfig?.id, startDate, endDate, timezone, audience]);

    const {data, loading} = useTinybirdQuery({
        endpoint: 'api_top_locations',
        statsConfig,
        params
    });

    const isLoading = isConfigLoading || loading;

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
            <StatsView isLoading={false}>
                <LocationsCard data={data} isLoading={isLoading} range={range} />
            </StatsView>
        </StatsLayout>
    );
};

export default Locations;
