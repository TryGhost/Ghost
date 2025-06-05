import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, Separator, formatNumber, formatPercentage, isValidDomain} from '@tryghost/shade';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useQuery} from '@tinybirdco/charts';

interface SourceRowProps {
    className?: string;
    source?: string | number;
}

export const SourceRow: React.FC<SourceRowProps> = ({className, source}) => {
    return (
        <>
            <img
                className="size-4"
                src={`https://www.faviconextractor.com/favicon/${source || 'direct'}?larger=true`}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                }} />
            <span className={className}>{source || 'Direct'}</span>
        </>
    );
};

interface SourcesProps {
    queryParams: Record<string, string | number>
}

interface SourceData {
    source: string;
    visits: number;
}

interface SourceDataWithPercentage extends SourceData {
    percentage: number;
}

const Sources:React.FC<SourcesProps> = ({queryParams}) => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params: queryParams
    });

    const totalVisits = React.useMemo(() => {
        if (!data) {
            return 0;
        }
        return (data as unknown as SourceData[]).reduce((sum: number, source: SourceData) => sum + Number(source.visits), 0);
    }, [data]);

    const dataWithPercentages = React.useMemo(() => {
        if (!data) {
            return [];
        }
        return (data as unknown as SourceData[]).map((source: SourceData) => ({
            ...source,
            percentage: Number(source.visits) / totalVisits
        })) as SourceDataWithPercentage[];
    }, [data, totalVisits]);

    const isLoading = isConfigLoading || loading;

    return (
        <>
            {isLoading ? '' :
                <>
                    {data!.length > 0 &&
                        <Card className='group/datalist'>
                            <CardHeader>
                                <CardTitle>Top Sources</CardTitle>
                                <CardDescription>How readers found your post</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                <DataList>
                                    <DataListHeader>
                                        <DataListHead>Source</DataListHead>
                                        <DataListHead>Visitors</DataListHead>
                                    </DataListHeader>
                                    <DataListBody>
                                        {dataWithPercentages?.map((row) => {
                                            return (
                                                <DataListRow key={row.source || 'direct'} className='group/row'>
                                                    <DataListBar className='opacity-15 transition-all' style={{
                                                        width: `${Math.round(row.percentage * 100)}%`,
                                                        backgroundColor: 'hsl(var(--chart-orange))'
                                                    }} />
                                                    <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                                        <div className='flex items-center space-x-4 overflow-hidden'>
                                                            <div className={`truncate font-medium`}>
                                                                {row.source && typeof row.source === 'string' && isValidDomain(row.source) ?
                                                                    <a className='group/link flex items-center gap-2' href={`https://${row.source}`} rel="noreferrer" target="_blank">
                                                                        <SourceRow className='group-hover/link:underline' source={row.source} />
                                                                    </a>
                                                                    :
                                                                    <span className='flex items-center gap-2'>
                                                                        <SourceRow source={row.source} />
                                                                    </span>
                                                                }
                                                            </div>
                                                        </div>
                                                    </DataListItemContent>
                                                    <DataListItemValue>
                                                        <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                                        <DataListItemValuePerc>{formatPercentage(row.percentage)}</DataListItemValuePerc>
                                                    </DataListItemValue>
                                                </DataListRow>
                                            );
                                        })}
                                    </DataListBody>
                                </DataList>
                            </CardContent>
                        </Card>
                    }
                </>
            }
        </>
    );
};

export default Sources;
