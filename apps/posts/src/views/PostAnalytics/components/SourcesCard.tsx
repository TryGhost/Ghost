import React from 'react';
import {BaseSourceData, ProcessedSourceData, extendSourcesWithPercentages, processSources} from '@tryghost/admin-x-framework';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';

// Default source icon URL - apps can override this
const DEFAULT_SOURCE_ICON_URL = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

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
                            <DataListBar className='bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 opacity-20 transition-all group-hover/row:opacity-40' style={{
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
    title = 'Top sources',
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
        return processSources({
            data,
            mode,
            siteUrl,
            siteIcon,
            defaultSourceIconUrl
        });
    }, [data, siteUrl, siteIcon, mode, defaultSourceIconUrl]);

    // Extend processed data with percentage values for visits mode
    const extendedData = React.useMemo(() => {
        return extendSourcesWithPercentages({
            processedData,
            totalVisitors,
            mode
        });
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