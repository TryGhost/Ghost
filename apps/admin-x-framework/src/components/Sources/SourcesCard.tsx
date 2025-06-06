import React from 'react';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';
import {getFaviconDomain} from '../../utils/source-utils';

// Default source icon URL - apps can override this
const DEFAULT_SOURCE_ICON_URL = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

// Base interface for all source data types
interface BaseSourceData {
    source?: string | number;
    visits?: number;
    free_members?: number;
    paid_members?: number;
    mrr?: number;
    [key: string]: unknown;
}

// Processed source data with pre-computed display values
interface ProcessedSourceData {
    source: string;
    visits: number;
    isDirectTraffic: boolean;
    iconSrc: string;
    displayName: string;
    linkUrl?: string;
    percentage?: number;
    // Additional fields for growth data
    free_members?: number;
    paid_members?: number;
    mrr?: number;
}

interface SourcesTableProps {
    data: ProcessedSourceData[] | null;
    mode: 'visits' | 'growth';
    range?: number;
    defaultSourceIconUrl?: string;
    getPeriodText?: (range: number) => string;
}

const SourcesTable: React.FC<SourcesTableProps> = ({data, mode, defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL}) => {
    if (mode === 'growth') {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className='w-[110px] text-right'>Free members</TableHead>
                        <TableHead className='w-[110px] text-right'>Paid members</TableHead>
                        <TableHead className='w-[110px] text-right'>MRR impact</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data?.map((row) => {
                        const centsToDollars = (value: number) => Math.round(value / 100);
                        
                        return (
                            <TableRow key={row.source}>
                                <TableCell>
                                    {row.linkUrl ?
                                        <a className='group flex items-center gap-2' href={row.linkUrl} rel="noreferrer" target="_blank">
                                            <img
                                                className="size-4"
                                                src={row.iconSrc}
                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                    e.currentTarget.src = defaultSourceIconUrl;
                                                }} />
                                            <span className='group-hover:underline'>{row.displayName}</span>
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
                                </TableCell>
                                <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.free_members || 0)}</TableCell>
                                <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.paid_members || 0)}</TableCell>
                                <TableCell className='text-right font-mono text-sm'>+${centsToDollars(row.mrr || 0)}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        );
    }

    // Default visits mode using DataList
    return (
        <DataList>
            <DataListHeader>
                <DataListHead>Source</DataListHead>
                <DataListHead>Visitors</DataListHead>
            </DataListHeader>
            <DataListBody>
                {data?.map((row) => {
                    return (
                        <DataListRow key={row.source} className='group/row'>
                            <DataListBar className='from-muted-foreground/40 to-muted-foreground/60 bg-gradient-to-r opacity-20 transition-all group-hover/row:opacity-40' style={{
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
    title?: string;
    description?: string;
    data: BaseSourceData[] | null;
    mode?: 'visits' | 'growth';
    range?: number;
    totalVisitors?: number;
    siteUrl?: string;
    siteIcon?: string;
    defaultSourceIconUrl?: string;
    getPeriodText?: (range: number) => string;
}

export const SourcesCard: React.FC<SourcesCardProps> = ({
    title = 'Top Sources',
    description,
    data,
    mode = 'visits',
    range = 30,
    totalVisitors = 0,
    siteUrl,
    siteIcon,
    defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL,
    getPeriodText
}) => {
    // Process and group sources data with pre-computed icons and display values
    const processedData = React.useMemo(() => {
        if (!data) {
            return [];
        }

        const sourceMap = new Map<string, ProcessedSourceData>();
        let directTrafficTotal = mode === 'visits' ? 0 : undefined;
        const directTrafficData = mode === 'growth' ? {
            free_members: 0,
            paid_members: 0,
            mrr: 0
        } : undefined;

        // Process each source and group direct traffic
        data.forEach((item) => {
            const {domain: faviconDomain, isDirectTraffic} = getFaviconDomain(item.source, siteUrl);
            const visits = Number(item.visits || 0);

            if (isDirectTraffic || !item.source || item.source === '') {
                // Accumulate all direct traffic
                if (mode === 'visits') {
                    directTrafficTotal! += visits;
                } else if (mode === 'growth' && directTrafficData) {
                    directTrafficData.free_members += item.free_members || 0;
                    directTrafficData.paid_members += item.paid_members || 0;
                    directTrafficData.mrr += item.mrr || 0;
                }
            } else {
                // Keep other sources as-is
                const sourceKey = String(item.source);
                const iconSrc = faviconDomain 
                    ? `https://www.faviconextractor.com/favicon/${faviconDomain}?larger=true`
                    : defaultSourceIconUrl;
                const linkUrl = faviconDomain ? `https://${faviconDomain}` : undefined;

                if (sourceMap.has(sourceKey)) {
                    const existing = sourceMap.get(sourceKey)!;
                    existing.visits += visits;
                    if (mode === 'growth') {
                        existing.free_members = (existing.free_members || 0) + (item.free_members || 0);
                        existing.paid_members = (existing.paid_members || 0) + (item.paid_members || 0);
                        existing.mrr = (existing.mrr || 0) + (item.mrr || 0);
                    }
                } else {
                    const processedItem: ProcessedSourceData = {
                        source: sourceKey,
                        visits,
                        isDirectTraffic: false,
                        iconSrc,
                        displayName: sourceKey,
                        linkUrl
                    };

                    if (mode === 'growth') {
                        processedItem.free_members = item.free_members || 0;
                        processedItem.paid_members = item.paid_members || 0;
                        processedItem.mrr = item.mrr || 0;
                    }

                    sourceMap.set(sourceKey, processedItem);
                }
            }
        });

        // Add consolidated direct traffic entry if there's any
        const hasDirectTraffic = mode === 'visits' 
            ? directTrafficTotal! > 0
            : directTrafficData && (directTrafficData.free_members > 0 || directTrafficData.paid_members > 0 || directTrafficData.mrr > 0);

        if (hasDirectTraffic) {
            const directEntry: ProcessedSourceData = {
                source: 'Direct',
                visits: mode === 'visits' ? directTrafficTotal! : 0,
                isDirectTraffic: true,
                iconSrc: siteIcon || defaultSourceIconUrl,
                displayName: 'Direct',
                linkUrl: undefined
            };

            if (mode === 'growth' && directTrafficData) {
                directEntry.free_members = directTrafficData.free_members;
                directEntry.paid_members = directTrafficData.paid_members;
                directEntry.mrr = directTrafficData.mrr;
            }

            sourceMap.set('Direct', directEntry);
        }

        // Convert back to array and sort
        const result = Array.from(sourceMap.values());
        
        if (mode === 'growth') {
            // Sort by total impact (prioritizing MRR, then paid members, then free members)
            return result.sort((a, b) => {
                const aScore = (a.mrr || 0) * 100 + (a.paid_members || 0) * 10 + (a.free_members || 0);
                const bScore = (b.mrr || 0) * 100 + (b.paid_members || 0) * 10 + (b.free_members || 0);
                return bScore - aScore;
            });
        } else {
            // Sort by visits
            return result.sort((a, b) => b.visits - a.visits);
        }
    }, [data, siteUrl, siteIcon, mode, defaultSourceIconUrl]);

    // Extend processed data with percentage values for visits mode
    const extendedData = React.useMemo(() => {
        if (mode === 'growth') {
            return processedData;
        }
        
        return processedData.map(item => ({
            ...item,
            percentage: totalVisitors > 0 ? (item.visits / totalVisitors) : 0
        }));
    }, [processedData, totalVisitors, mode]);

    const topSources = extendedData.slice(0, 10);
    
    // Generate description based on mode and range
    const cardDescription = description || (
        mode === 'growth' 
            ? 'Where did your growth come from?'
            : `How readers found your ${range ? 'site' : 'post'}${range && getPeriodText ? ` ${getPeriodText(range)}` : ''}`
    );

    const sheetTitle = mode === 'growth' ? 'Sources' : 'Top sources';
    const sheetDescription = mode === 'growth' 
        ? 'Where did your growth come from?'
        : `How readers found your ${range ? 'site' : 'post'}${range && getPeriodText ? ` ${getPeriodText(range)}` : ''}`;

    return (
        <Card className='group/datalist'>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{cardDescription}</CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                {topSources.length > 0 ? (
                    <SourcesTable data={topSources} defaultSourceIconUrl={defaultSourceIconUrl} getPeriodText={getPeriodText} mode={mode} range={range} />
                ) : (
                    <div className='py-20 text-center text-sm text-gray-700'>
                        {mode === 'growth' 
                            ? 'Once someone signs up on this post, sources will show here.'
                            : 'No sources data available.'
                        }
                    </div>
                )}
            </CardContent>
            {extendedData.length > 10 &&
                <CardFooter>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                        </SheetTrigger>
                        <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
                                <SheetTitle>{sheetTitle}</SheetTitle>
                                <SheetDescription>{sheetDescription}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                <SourcesTable data={extendedData} defaultSourceIconUrl={defaultSourceIconUrl} getPeriodText={getPeriodText} mode={mode} range={range} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </CardFooter>
            }
        </Card>
    );
};

export default SourcesCard; 