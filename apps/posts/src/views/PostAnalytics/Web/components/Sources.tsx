import React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, formatNumber, formatPercentage} from '@tryghost/shade';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {getFaviconDomain, getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {getPeriodText} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useQuery} from '@tinybirdco/charts';

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

interface SourcesTableProps {
    data: SourceDataWithPercentage[] | null;
    range: number;
    siteUrl?: string;
}

const SourcesTable: React.FC<SourcesTableProps> = ({data, siteUrl}) => {
    return (
        <DataList>
            <DataListHeader>
                <DataListHead>Source</DataListHead>
                <DataListHead>Visitors</DataListHead>
            </DataListHeader>
            <DataListBody>
                {data?.map((row) => {
                    const {domain, isDirectTraffic} = getFaviconDomain(row.source, siteUrl);
                    const displayName = isDirectTraffic ? 'Direct' : (row.source || 'Direct');

                    return (
                        <DataListRow key={row.source || 'direct'} className='group/row'>
                            <DataListBar className='bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 opacity-20 transition-all' style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                                // backgroundColor: 'hsl(var(--chart-blue))'
                            }} />
                            <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-4 overflow-hidden'>
                                    <div className={`truncate font-medium`}>
                                        {domain && !isDirectTraffic ?
                                            <a className='group/link flex items-center gap-2' href={`https://${domain}`} rel="noreferrer" target="_blank">
                                                <img
                                                    className="size-4"
                                                    src={`https://www.faviconextractor.com/favicon/${domain}?larger=true`}
                                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                        e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                                                    }} />
                                                <span className='group-hover/link:underline'>{displayName}</span>
                                            </a>
                                            :
                                            <span className='flex items-center gap-2'>
                                                <img
                                                    className="size-4"
                                                    src={STATS_DEFAULT_SOURCE_ICON_URL} />
                                                <span>{displayName}</span>
                                            </span>
                                        }
                                    </div>
                                </div>
                            </DataListItemContent>
                            <DataListItemValue>
                                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                <DataListItemValuePerc>{formatPercentage(row.percentage || 0)}</DataListItemValuePerc>
                            </DataListItemValue>
                        </DataListRow>
                    );
                })}
            </DataListBody>
        </DataList>
    );
};

const Sources:React.FC<SourcesProps> = ({queryParams}) => {
    const {statsConfig, data: globalData, isLoading: isConfigLoading, range} = useGlobalData();

    // Get site URL from global data
    const siteUrl = globalData?.url as string | undefined;

    // TEMPORARY: For testing levernews.com direct traffic grouping
    // Remove this line when done testing
    const testingSiteUrl = siteUrl || 'https://levernews.com';

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

    // Process and group sources data with direct traffic consolidation
    const processedData = React.useMemo(() => {
        if (!data) {
            return [];
        }

        const sourceMap = new Map<string, {source: string, visits: number, isDirectTraffic: boolean}>();
        let directTrafficTotal = 0;

        // Process each source and group direct traffic
        (data as unknown as SourceData[]).forEach((item) => {
            const {isDirectTraffic} = getFaviconDomain(item.source, testingSiteUrl);
            const visits = Number(item.visits);

            if (isDirectTraffic || !item.source || item.source === '') {
                // Accumulate all direct traffic
                directTrafficTotal += visits;
            } else {
                // Keep other sources as-is
                const sourceKey = String(item.source);
                if (sourceMap.has(sourceKey)) {
                    const existing = sourceMap.get(sourceKey)!;
                    existing.visits += visits;
                } else {
                    sourceMap.set(sourceKey, {
                        source: sourceKey,
                        visits,
                        isDirectTraffic: false
                    });
                }
            }
        });

        // Add consolidated direct traffic entry if there's any
        if (directTrafficTotal > 0) {
            sourceMap.set('Direct', {
                source: 'Direct',
                visits: directTrafficTotal,
                isDirectTraffic: true
            });
        }

        // Convert back to array and sort by visits
        return Array.from(sourceMap.values())
            .sort((a, b) => b.visits - a.visits);
    }, [data, testingSiteUrl]);

    const dataWithPercentages = React.useMemo(() => {
        return processedData.map(item => ({
            ...item,
            percentage: totalVisits > 0 ? (item.visits / totalVisits) : 0
        })) as SourceDataWithPercentage[];
    }, [processedData, totalVisits]);

    const isLoading = isConfigLoading || loading;

    return (
        <>
            {isLoading ? '' :
                <>
                    {dataWithPercentages.length > 0 &&
                        <Card className='group/datalist'>
                            <CardHeader>
                                <CardTitle>Top Sources</CardTitle>
                                <CardDescription>How readers found your post</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                <SourcesTable data={dataWithPercentages} range={range} siteUrl={testingSiteUrl} />
                            </CardContent>
                            {dataWithPercentages.length > 10 &&
                                <CardFooter>
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                                        </SheetTrigger>
                                        <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
                                                <SheetTitle>Top sources</SheetTitle>
                                                <SheetDescription>How readers found this post {getPeriodText(range)}</SheetDescription>
                                            </SheetHeader>
                                            <div className='group/datalist'>
                                                <SourcesTable data={dataWithPercentages} range={range} siteUrl={testingSiteUrl} />
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </CardFooter>
                            }
                        </Card>
                    }
                </>
            }
        </>
    );
};

export default Sources;
