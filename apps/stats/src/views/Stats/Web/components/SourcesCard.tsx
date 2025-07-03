import React from 'react';
import {BaseSourceData, ProcessedSourceData, extendSourcesWithPercentages, processSources} from '@tryghost/admin-x-framework';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, EmptyIndicator, HTable, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, formatNumber, formatPercentage} from '@tryghost/shade';
import {getPeriodText} from '@src/utils/chart-helpers';

// Default source icon URL - apps can override this
const DEFAULT_SOURCE_ICON_URL = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

interface SourcesTableProps {
    data: ProcessedSourceData[] | null;
    range?: number;
    defaultSourceIconUrl?: string;
    tableHeader: boolean;
}

const SourcesTable: React.FC<SourcesTableProps> = ({tableHeader, data, defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL}) => {
    return (
        <DataList>
            {tableHeader &&
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
                                                <img
                                                    className="size-4"
                                                    src={row.iconSrc}
                                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                        e.currentTarget.src = defaultSourceIconUrl;
                                                    }} />
                                                <span className='group-hover/link:underline'>{row.displayName}</span>
                                            </a>
                                            :
                                            <span className='flex items-center gap-2'>
                                                <img
                                                    className="size-4"
                                                    src={row.iconSrc}
                                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                        e.currentTarget.src = defaultSourceIconUrl;
                                                    }} />
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

interface SourcesCardProps {
    data: BaseSourceData[] | null;
    range?: number;
    totalVisitors?: number;
    siteUrl?: string;
    siteIcon?: string;
    defaultSourceIconUrl?: string;
    isLoading: boolean;
}

export const SourcesCard: React.FC<SourcesCardProps> = ({
    data,
    range = 30,
    totalVisitors = 0,
    siteUrl,
    siteIcon,
    defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL,
    isLoading
}) => {
    // Process and group sources data with pre-computed icons and display values
    const processedData = React.useMemo(() => {
        return processSources({
            data,
            mode: 'visits',
            siteUrl,
            siteIcon,
            defaultSourceIconUrl
        });
    }, [data, siteUrl, siteIcon, defaultSourceIconUrl]);

    // Extend processed data with percentage values for visits mode
    const extendedData = React.useMemo(() => {
        return extendSourcesWithPercentages({
            processedData,
            totalVisitors,
            mode: 'visits'
        });
    }, [processedData, totalVisitors]);

    const topSources = extendedData.slice(0, 11);

    // Generate description based on mode and range
    const title = 'Top sources';
    const description = `How readers found your ${range ? 'site' : 'post'} ${getPeriodText(range)}`;

    if (isLoading) {
        return (
            <Card className='group/datalist'>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <SkeletonTable lines={5} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className='group/datalist'>
            <div className='flex items-center justify-between gap-6 p-6'>
                <CardHeader className='p-0'>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <HTable className='mr-2'>Visitors</HTable>
            </div>
            <CardContent className='overflow-hidden'>
                <Separator />
                {topSources.length > 0 ? (
                    <SourcesTable
                        data={topSources}
                        defaultSourceIconUrl={defaultSourceIconUrl}
                        range={range}
                        tableHeader={false} />
                ) : (
                    <EmptyIndicator
                        className='mt-8 w-full py-20'
                        title={`No visitors ${getPeriodText(range)}`}
                    >
                        <LucideIcon.Globe strokeWidth={1.5} />
                    </EmptyIndicator>
                )}
            </CardContent>
            {extendedData.length > 11 &&
                <CardFooter>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                        </SheetTrigger>
                        <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                                <SheetTitle>{title}</SheetTitle>
                                <SheetDescription>{description}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                <SourcesTable
                                    data={extendedData}
                                    defaultSourceIconUrl={defaultSourceIconUrl}
                                    range={range}
                                    tableHeader={true} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            }
        </Card>
    );
};

export default SourcesCard;