import React from 'react';
import {SourcesCard, getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useQuery} from '@tinybirdco/charts';

interface SourcesProps {
    queryParams: Record<string, string | number>
}

const Sources: React.FC<SourcesProps> = ({queryParams}) => {
    const {statsConfig, data: globalData, isLoading: isConfigLoading, range} = useGlobalData();

    // Get site URL and icon from global data
    const siteUrl = globalData?.url as string | undefined;
    const siteIcon = globalData?.icon as string | undefined;

    // TEMPORARY: For testing levernews.com direct traffic grouping
    // Remove this line when done testing
    const testingSiteUrl = siteUrl || 'https://levernews.com';

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params: queryParams
    });

    // Calculate total visits for percentage calculation
    const totalVisits = React.useMemo(() => {
        if (!data) {
            return 0;
        }
        return data.reduce((sum, source) => sum + Number(source.visits || 0), 0);
    }, [data]);

    const isLoading = isConfigLoading || loading;

    if (isLoading) {
        return null;
    }

    if (!data || data.length === 0) {
        return null;
    }

    return (
        <SourcesCard 
            data={data}
            description="How readers found your post"
            mode="visits"
            range={range}
            siteIcon={siteIcon}
            siteUrl={testingSiteUrl}
            totalVisitors={totalVisits}
        />
    );
};

export default Sources;
