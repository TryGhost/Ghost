import React from 'react';
import SourceIcon from '../../components/source-icon';
import {BaseSourceData, ProcessedSourceData, extendSourcesWithPercentages, processSources} from '@tryghost/admin-x-framework';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, EmptyIndicator, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SkeletonTable, formatNumber, formatPercentage} from '@tryghost/shade';
import {getPeriodText} from '@src/utils/chart-helpers';

// Default source icon URL - apps can override this
const DEFAULT_SOURCE_ICON_URL = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

interface SourcesTableProps {
    data: ProcessedSourceData[] | null;
    range?: number;
    defaultSourceIconUrl?: string;
    tableHeader: boolean;
    onSourceClick?: (source: string) => void;
}

const SourcesTable: React.FC<SourcesTableProps> = ({tableHeader, data, defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL, onSourceClick}) => {
    const handleRowClick = (row: ProcessedSourceData) => {
        if (onSourceClick) {
            // Pass empty string for "Direct" traffic, otherwise use the source value
            onSourceClick(row.isDirectTraffic ? '' : row.source);
        }
    };

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
                        <DataListRow
                            key={row.source}
                            className={onSourceClick ? 'group/row cursor-pointer transition-colors hover:bg-accent/50' : 'group/row'}
                            data-testid={`source-row-${row.isDirectTraffic ? 'direct' : row.source}`}
                            onClick={onSourceClick ? () => handleRowClick(row) : undefined}
                        >
                            <DataListBar style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                            }} />
                            <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-4 overflow-hidden'>
                                    <div className='truncate font-medium'>
                                        {row.linkUrl && !onSourceClick ?
                                            <a className='group/link flex items-center gap-2' href={row.linkUrl} rel="noreferrer" target="_blank" onClick={e => e.stopPropagation()}>
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

interface SourcesCardProps {
    data: BaseSourceData[] | null;
    range?: number;
    totalVisitors?: number;
    siteUrl?: string;
    siteIcon?: string;
    defaultSourceIconUrl?: string;
    isLoading: boolean;
    onSourceClick?: (source: string) => void;
}

export const SourcesCard: React.FC<SourcesCardProps> = ({
    data,
    range = 30,
    totalVisitors = 0,
    siteUrl,
    siteIcon,
    defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL,
    isLoading,
    onSourceClick
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

    const topSources = extendedData.slice(0, 6);

    // Generate description based on mode and range
    const title = 'Top sources';
    const description = `How readers found your ${range ? 'site' : 'post'} ${getPeriodText(range)}`;

    return (
        <Card className='group/datalist' data-testid='top-sources-card'>
            <div className='flex items-center justify-between gap-6 px-6 pb-5 pt-6'>
                <CardHeader className='p-0'>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
            </div>
            <CardContent className='overflow-hidden'>
                <div className='mb-2 flex h-6 items-center justify-between'>
                    <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Source</div>
                    <div className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Visitors</div>
                </div>
                <Separator />
                {isLoading && !data ?
                    <SkeletonTable className='mt-3' />
                    : (topSources.length > 0 ? (
                        <SourcesTable
                            data={topSources}
                            defaultSourceIconUrl={defaultSourceIconUrl}
                            range={range}
                            tableHeader={false}
                            onSourceClick={onSourceClick} />
                    ) : (
                        <EmptyIndicator
                            className='mt-8 w-full py-20'
                            title={`No visitors ${getPeriodText(range)}`}
                        >
                            <LucideIcon.Globe strokeWidth={1.5} />
                        </EmptyIndicator>
                    ))}
            </CardContent>
            {extendedData.length > 6 &&
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
                                    tableHeader={true}
                                    onSourceClick={onSourceClick} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            }
        </Card>
    );
};

export default SourcesCard;
