import React from 'react';
import {BaseSourceData, ProcessedSourceData, extendSourcesWithPercentages, processSources, useNavigate} from '@tryghost/admin-x-framework';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, EmptyIndicator, LucideIcon, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber} from '@tryghost/shade';
import {useAppContext} from '@src/App';

// Default source icon URL - apps can override this
const DEFAULT_SOURCE_ICON_URL = 'https://www.google.com/s2/favicons?domain=ghost.org&sz=64';

interface SourcesTableProps {
    data: ProcessedSourceData[] | null;
    mode: 'visits' | 'growth';
    range?: number;
    defaultSourceIconUrl?: string;
    getPeriodText?: (range: number) => string;
    headerStyle?: 'card' | 'table';
    children?: React.ReactNode;
}

const SourcesTable: React.FC<SourcesTableProps> = ({headerStyle = 'table', children = 'Source', data, mode, defaultSourceIconUrl = DEFAULT_SOURCE_ICON_URL}) => {
    const {appSettings} = useAppContext();

    if (mode === 'growth') {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className='min-w-[320px]' variant={headerStyle === 'table' ? 'default' : 'cardhead'}>{children}</TableHead>
                        <TableHead className='w-[110px] text-right'>Free members</TableHead>
                        {appSettings?.paidMembersEnabled &&
                        <>
                            <TableHead className='w-[110px] text-right'>Paid members</TableHead>
                            <TableHead className='w-[100px] text-right'>MRR impact</TableHead>
                        </>
                        }
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data?.map((row) => {
                        const centsToDollars = (value: number) => Math.round(value / 100);

                        return (
                            <TableRow key={row.source} className='last:border-none'>
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
                                {appSettings?.paidMembersEnabled &&
                                <>
                                    <TableCell className='text-right font-mono text-sm'>+{formatNumber(row.paid_members || 0)}</TableCell>
                                    <TableCell className='text-right font-mono text-sm'>+${centsToDollars(row.mrr || 0)}</TableCell>
                                </>
                                }
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        );
    }
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

export const GrowthSources: React.FC<SourcesCardProps> = ({
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
    const {appSettings} = useAppContext();
    const navigate = useNavigate();
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
        <Card className='group/datalist w-full max-w-[calc(100vw-64px)] overflow-x-auto sidebar:max-w-[calc(100vw-64px-280px)]'>
            {topSources.length <= 0 &&
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{cardDescription}</CardDescription>
                </CardHeader>
            }
            <CardContent>
                {mode === 'growth' && !appSettings?.analytics.membersTrackSources ? (
                    <EmptyIndicator
                        actions={
                            <Button variant='outline' onClick={() => navigate('/settings/analytics', {crossApp: true})}>
                                Open settings
                            </Button>
                        }
                        className='py-10'
                        description='Enable member source tracking in settings to see which content drives member growth.'
                        title='Member sources have been disabled'
                    >
                        <LucideIcon.Activity />
                    </EmptyIndicator>
                ) : topSources.length > 0 ? (
                    <SourcesTable
                        data={topSources}
                        defaultSourceIconUrl={defaultSourceIconUrl}
                        getPeriodText={getPeriodText}
                        headerStyle='card'
                        mode={mode}
                        range={range}
                    >
                        <CardHeader>
                            <CardTitle>{title}</CardTitle>
                            <CardDescription>{cardDescription}</CardDescription>
                        </CardHeader>
                    </SourcesTable>
                ) : (
                    <div className='py-20 text-center text-sm text-gray-700'>
                        <EmptyIndicator
                            className='h-full'
                            description={mode === 'growth' && `Once someone signs up on this post, sources will show here`}
                            title={`No sources data available ${getPeriodText ? getPeriodText(range) : ''}`}
                        >
                            <LucideIcon.UserPlus strokeWidth={1.5} />
                        </EmptyIndicator>
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
                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                                <SheetTitle>{sheetTitle}</SheetTitle>
                                <SheetDescription>{sheetDescription}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                <SourcesTable
                                    data={extendedData}
                                    defaultSourceIconUrl={defaultSourceIconUrl}
                                    getPeriodText={getPeriodText}
                                    mode={mode}
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

export default GrowthSources;
