import React, {useState} from 'react';
import SourceIcon from '../../components/SourceIcon';
import {BaseSourceData, ProcessedSourceData, extendSourcesWithPercentages, processSources, useTinybirdQuery} from '@tryghost/admin-x-framework';
import {Button, CampaignType, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, HTable, LucideIcon, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, TabType, UtmCampaignTabs, formatNumber, formatPercentage, formatQueryDate, getRangeDates} from '@tryghost/shade';
import {getAudienceQueryParam} from '../../components/AudienceSelect';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

// Default source icon URL - apps can override this
const DEFAULT_SOURCE_ICON_URL = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

interface SourcesTableProps {
    data: ProcessedSourceData[] | null;
    range?: number;
    defaultSourceIconUrl?: string;
    dataTableHeader: boolean;
}

export const SourcesTable: React.FC<SourcesTableProps> = ({dataTableHeader, data, defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL}) => {
    return (
        <DataList>
            {dataTableHeader &&
                <DataListHeader>
                    <DataListHead>Source</DataListHead>
                    <DataListHead>Visitors</DataListHead>
                </DataListHeader>
            }
            <DataListBody>
                {data?.map((row) => {
                    return (
                        <DataListRow key={row.source} className='group/row'>
                            <DataListBar style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                            }} />
                            <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-4 overflow-hidden'>
                                    <div className='truncate font-medium'>
                                        {row.linkUrl ?
                                            <a className='group/link flex items-center gap-2' href={row.linkUrl} rel="noreferrer" target="_blank">
                                                <SourceIcon
                                                    defaultSourceIconUrl={defaultSourceIconUrl}
                                                    displayName={row.displayName}
                                                    iconSrc={row.iconSrc}
                                                />
                                                <span className='group-hover/link:underline'>{row.displayName}</span>
                                            </a>
                                            :
                                            <span className='flex items-center gap-2'>
                                                <SourceIcon
                                                    defaultSourceIconUrl={defaultSourceIconUrl}
                                                    displayName={row.displayName}
                                                    iconSrc={row.iconSrc}
                                                />
                                                <span>{row.displayName}</span>
                                            </span>
                                        }
                                    </div>
                                </div>
                            </DataListItemContent>
                            <DataListItemValue>
                                <DataListItemValueAbs>{formatNumber(row.visits)}</DataListItemValueAbs>
                                <DataListItemValuePerc>{formatPercentage(row.percentage || 0)}</DataListItemValuePerc>
                            </DataListItemValue>
                        </DataListRow>
                    );
                })}
            </DataListBody>
        </DataList>
    );
};

interface SourcesData {
    source?: string | number;
    visits?: number;
    [key: string]: unknown;
    percentage?: number;
}

interface SourcesCardProps {
    title?: string;
    description?: string;
    data: BaseSourceData[] | null;
    range?: number;
    totalVisitors?: number;
    siteUrl?: string;
    siteIcon?: string;
    defaultSourceIconUrl?: string;
    getPeriodText?: (range: number) => string;
    tableOnly?: boolean;
    topSourcesLimit?:number;
}

export const Sources: React.FC<SourcesCardProps> = ({
    data,
    range = 30,
    totalVisitors = 0,
    siteUrl,
    siteIcon,
    defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL,
    tableOnly = false,
    topSourcesLimit = 10
}) => {
    const {data: globalData, statsConfig, audience, post, isPostLoading} = useGlobalData();
    const [selectedTab, setSelectedTab] = useState<TabType>('sources');
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignType>('');

    // Check if UTM tracking is enabled in labs
    const utmTrackingEnabled = globalData?.labs?.utmTracking || false;

    // Get date range parameters
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Construct params object
    const params = React.useMemo(() => {
        const baseParams = {
            site_uuid: statsConfig?.id || '',
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            timezone: timezone,
            member_status: getAudienceQueryParam(audience),
            post_uuid: ''
        };

        if (!isPostLoading && post?.uuid) {
            return {
                ...baseParams,
                post_uuid: post.uuid
            };
        }

        return baseParams;
    }, [isPostLoading, post, statsConfig?.id, startDate, endDate, timezone, audience]);

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
        statsConfig: statsConfig || {id: ''},
        params: params || {},
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
        return data;
    }, [data, utmData, selectedTab, selectedCampaign]);

    // Process and group sources data with pre-computed icons and display values
    const processedData = React.useMemo(() => {
        return processSources({
            data: displayData,
            mode: 'visits',
            siteUrl,
            siteIcon,
            defaultSourceIconUrl
        });
    }, [displayData, siteUrl, siteIcon, defaultSourceIconUrl]);

    // Extend processed data with percentage values for visits mode
    const extendedData = React.useMemo(() => {
        return extendSourcesWithPercentages({
            processedData,
            totalVisitors,
            mode: 'visits'
        });
    }, [processedData, totalVisitors]);

    const topSources = extendedData.slice(0, topSourcesLimit);

    // Generate title and description based on mode and range
    const cardTitle = selectedTab === 'campaigns' && selectedCampaign ? `${selectedCampaign}` : 'Top sources';
    const cardDescription = `How readers found this post ${range && ` ${getPeriodText(range)}`}`;

    if (tableOnly) {
        const limitedData = extendedData.slice(0, topSourcesLimit);
        const hasMore = extendedData.length > topSourcesLimit;

        return (
            <div>
                <SourcesTable
                    data={limitedData}
                    dataTableHeader={false}
                    defaultSourceIconUrl={defaultSourceIconUrl}
                    range={range}
                />
                {hasMore && (
                    <div className='mt-4'>
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button className='w-full' size='sm' variant='outline'>
                                    View all ({extendedData.length}) <LucideIcon.ArrowRight size={14} />
                                </Button>
                            </SheetTrigger>
                            <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                                <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                                    <SheetTitle>{cardTitle}</SheetTitle>
                                    <SheetDescription>{cardDescription}</SheetDescription>
                                </SheetHeader>
                                <div className='group/datalist'>
                                    <SourcesTable
                                        data={extendedData}
                                        dataTableHeader={true}
                                        defaultSourceIconUrl={defaultSourceIconUrl}
                                        range={range}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                )}
            </div>
        );
    }

    const isLoading = isPostLoading || isUtmLoading;

    return (
        <Card className='group/datalist'>
            <div className='flex items-center justify-between p-6'>
                <CardHeader className='p-0'>
                    <CardTitle>{cardTitle}</CardTitle>
                    <CardDescription>{cardDescription}</CardDescription>
                </CardHeader>
                <HTable className='mr-2'>Visitors</HTable>
            </div>
            <CardContent className='overflow-hidden'>
                {utmTrackingEnabled && (
                    <div className='mb-4'>
                        <UtmCampaignTabs
                            selectedCampaign={selectedCampaign}
                            selectedTab={selectedTab}
                            onCampaignChange={setSelectedCampaign}
                            onTabChange={setSelectedTab}
                        />
                    </div>
                )}
                <div className='h-[1px] w-full bg-border' />
                {isLoading ?
                    <SkeletonTable lines={5} />
                    :
                    (topSources.length > 0 ? (
                        <SourcesTable
                            data={topSources}
                            dataTableHeader={false}
                            defaultSourceIconUrl={defaultSourceIconUrl}
                            range={range}
                        />
                    ) : (
                        <div className='py-20 text-center text-sm text-gray-700'>
                    No sources data available.
                        </div>
                    ))
                }
            </CardContent>
            {extendedData.length > 10 &&
                <CardFooter>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                        </SheetTrigger>
                        <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                                <SheetTitle>{cardTitle}</SheetTitle>
                                <SheetDescription>{cardDescription}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                <SourcesTable
                                    data={extendedData}
                                    dataTableHeader={true}
                                    defaultSourceIconUrl={defaultSourceIconUrl}
                                    range={range}
                                />
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            }
        </Card>
    );
};

export default Sources;
