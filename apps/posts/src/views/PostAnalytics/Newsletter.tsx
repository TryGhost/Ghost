// import AudienceSelect from './components/AudienceSelect';
import KpiCard, {KpiCardContent, KpiCardIcon, KpiCardLabel, KpiCardValue} from './components/KpiCard';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, Input, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, ViewHeader, formatNumber, formatPercentage} from '@tryghost/shade';
import {calculateYAxisWidth} from '@src/utils/chart-helpers';
import {useEditLinks} from '@src/hooks/useEditLinks';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useParams} from '@tryghost/admin-x-framework';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

interface postAnalyticsProps {}

// Grouped link type after processing
interface GroupedLinkData {
    url: string;
    clicks: number;
    edited: boolean;
}

const sanitizeUrl = (url: string): string => {
    return url.replace(/^https?:\/\//, '');
};

const cleanTrackedUrl = (url: string, showTitle = false): string => {
    // Extract the URL before the ? but keep the hash part
    const [urlPart, queryPart] = url.split('?');
    
    if (!queryPart) {
        // Check if the urlPart itself has a hash
        const hashIndex = urlPart.indexOf('#');
        if (hashIndex > -1) {
            return showTitle ? urlPart.substring(0, hashIndex) : urlPart;
        }
        return urlPart;
    }
    
    // If there's a hash in the query part, preserve it
    const hashMatch = queryPart.match(/#(.+)$/);
    if (hashMatch) {
        return showTitle ? urlPart : `${urlPart}#${hashMatch[1]}`;
    }
    
    return urlPart;
};

const Newsletter: React.FC<postAnalyticsProps> = () => {
    const {postId} = useParams();
    const [editingUrl, setEditingUrl] = useState<string | null>(null);
    const [editedUrl, setEditedUrl] = useState('');
    const [originalUrl, setOriginalUrl] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const {stats, averageStats, topLinks, isLoading: isNewsletterStatsLoading, refetchTopLinks} = usePostNewsletterStats(postId || '');
    const {editLinks} = useEditLinks();

    const handleEdit = (url: string) => {
        setEditingUrl(url);
        setEditedUrl(url);
        setOriginalUrl(url);
    };

    const handleUpdate = () => {
        editLinks({
            originalUrl,
            editedUrl,
            postId: postId || ''
        }, {
            onSuccess: () => {
                setEditingUrl(null);
                setEditedUrl('');
                setOriginalUrl('');
                refetchTopLinks();
            }
        });
    };

    useEffect(() => {
        if (editingUrl && inputRef.current) {
            inputRef.current.focus();

            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    if (editedUrl === originalUrl) {
                        setEditingUrl(null);
                        setEditedUrl('');
                        setOriginalUrl('');
                    }
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [editingUrl, originalUrl, editedUrl]);

    const isLoading = isNewsletterStatsLoading;

    const barDomain = [0, 1];
    const barTicks = [0, 0.25, 0.5, 0.75, 1];
    const chartData = [
        {metric: 'Opened', current: stats.openedRate, average: averageStats.openedRate},
        {metric: 'Clicked', current: stats.clickedRate, average: averageStats.clickedRate}
    ];
    const chartConfig = {
        current: {
            label: 'This post',
            color: 'hsl(var(--chart-1))'
        },
        average: {
            label: 'Your average newsletter',
            color: 'hsl(var(--chart-gray))'
        }
    } satisfies ChartConfig;

    // Memoize link processing to avoid unnecessary recomputation on renders
    const displayLinks = useMemo(() => {
        // Process links data to group by URL
        const processedLinks = topLinks.reduce<Record<string, GroupedLinkData>>((acc, link) => {
            // For grouping, we use the clean URL (path only with hash)
            const cleanUrl = cleanTrackedUrl(link.url, false);
            
            if (!acc[cleanUrl]) {
                acc[cleanUrl] = {
                    url: cleanUrl,
                    clicks: 0,
                    edited: false
                };
            }
            
            acc[cleanUrl].clicks += link.clicks;
            acc[cleanUrl].edited = acc[cleanUrl].edited || link.edited;
            
            return acc;
        }, {});
        
        // Sort by click count
        return Object.values(processedLinks).sort((a, b) => b.clicks - a.clicks);
    }, [topLinks]); // Only recalculate when topLinks changes

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4'>
                <PostAnalyticsHeader currentTab='Newsletter' />
                {/* <ViewHeaderActions className='mb-2'>
                    <AudienceSelect />
                </ViewHeaderActions> */}
            </ViewHeader>
            <PostAnalyticsContent>
                {isLoading ? 'Loading' :
                    <div className='flex flex-col items-stretch gap-6'>
                        <Card>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='-mx-1 grid grid-cols-3 gap-6 pt-5'>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.Send strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Sent</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(stats.sent)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.MailOpen strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Opened</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(stats.opened)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.MousePointerClick strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Clicked</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(stats.clicked)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                                <ChartContainer className='mt-10 max-h-[320px] w-full' config={chartConfig}>
                                    <Recharts.BarChart barCategoryGap={24} data={chartData} accessibilityLayer>
                                        <Recharts.CartesianGrid vertical={false} />
                                        <Recharts.YAxis
                                            axisLine={false}
                                            domain={barDomain}
                                            tickFormatter={value => formatPercentage(value)}
                                            tickLine={false}
                                            ticks={barTicks}
                                            width={calculateYAxisWidth(barTicks, value => formatPercentage(value))}
                                        />
                                        <Recharts.XAxis
                                            axisLine={false}
                                            dataKey="metric"
                                            tickFormatter={value => (value)}
                                            tickLine={false}
                                            tickMargin={10}
                                        />
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    className="text-muted-foreground"
                                                    formatter={(value, name) => (
                                                        <>
                                                            <div
                                                                className="size-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
                                                                style={{'--color-bg': `var(--color-${name})`} as React.CSSProperties
                                                                }
                                                            />
                                                            {chartConfig[name as keyof typeof chartConfig]?.label || name}
                                                            <div className="ml-auto flex items-baseline gap-0.5 pl-2 font-mono font-medium tabular-nums text-foreground">
                                                                {formatPercentage(value)}
                                                            </div>
                                                        </>
                                                    )}
                                                    hideLabel
                                                />
                                            }
                                            cursor={false}
                                        />
                                        <Recharts.Bar
                                            barSize={48}
                                            dataKey="current"
                                            fill="var(--color-current)"
                                            minPointSize={2}
                                            radius={0}
                                        />
                                        <Recharts.Bar
                                            barSize={48}
                                            dataKey="average"
                                            fill="var(--color-average)"
                                            minPointSize={2}
                                            radius={0}
                                        />
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </Recharts.BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Newsletter clicks</CardTitle>
                                <CardDescription>Which links resonated with your readers</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                {topLinks.length > 0
                                    ?
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className='w-full'>Link</TableHead>
                                                <TableHead className='w-[0%] text-nowrap text-right'>No. of members</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {displayLinks.map((row) => {
                                                const url = row.url;
                                                const edited = row.edited;
                                                
                                                return (
                                                    <TableRow key={url}>
                                                        <TableCell className='max-w-0'>
                                                            <div className='flex items-center gap-2'>
                                                                {editingUrl === url ? (
                                                                    <div ref={containerRef} className='flex w-full items-center gap-2'>
                                                                        <Input
                                                                            ref={inputRef}
                                                                            className="h-7 w-full border-border bg-background text-sm"
                                                                            value={editedUrl}
                                                                            onChange={e => setEditedUrl(e.target.value)}
                                                                        />
                                                                        <Button
                                                                            size='sm'
                                                                            onClick={handleUpdate}
                                                                        >
                                                                            Update
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <Button
                                                                            className='shrink-0 bg-background'
                                                                            size='sm'
                                                                            variant='outline'
                                                                            onClick={() => handleEdit(url)}
                                                                        >
                                                                            <LucideIcon.Pen />
                                                                        </Button>
                                                                        <a
                                                                            className='block truncate font-medium hover:underline'
                                                                            href={url}
                                                                            rel="noreferrer"
                                                                            target='_blank'
                                                                            title={url}
                                                                        >
                                                                            {sanitizeUrl(url)}
                                                                        </a>
                                                                        {edited && (
                                                                            <span className='text-xs text-gray-500'>(edited)</span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className='text-right font-mono text-sm'>{formatNumber(row.clicks)}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                        <TableFooter className='bg-transparent'>
                                            <TableRow>
                                                <TableCell className='group-hover:bg-transparent' colSpan={2}>
                                                    <div className='ml-2 mt-1 flex items-center gap-2 text-green'>
                                                        <LucideIcon.ArrowUp size={20} strokeWidth={1.5} />
                                                        Sent a broken link? You can update it!
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                    :
                                    <div className='py-20 text-center text-sm text-gray-700'>
                                    You have no links in your post.
                                    </div>
                                }
                            </CardContent>
                        </Card>
                    </div>
                }
            </PostAnalyticsContent>
        </PostAnalyticsLayout>
    );
};

export default Newsletter;
