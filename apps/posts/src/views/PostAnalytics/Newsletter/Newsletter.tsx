// import AudienceSelect from './components/AudienceSelect';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Input, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, formatNumber, formatPercentage} from '@tryghost/shade';
import {useEditLinks} from '@src/hooks/useEditLinks';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useParams} from '@tryghost/admin-x-framework';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

interface postAnalyticsProps {}

// Grouped link type after processing
export interface GroupedLinkData {
    url: string;
    clicks: number;
    edited: boolean;
}

export const sanitizeUrl = (url: string): string => {
    return url.replace(/^https?:\/\//, '');
};

export const cleanTrackedUrl = (url: string, showTitle = false): string => {
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

type NewsletterRadialChartData = {
    datatype: string,
    value: number,
    fill: string
}

interface NewsletterRadialChartProps {
    data: NewsletterRadialChartData[],
    config: ChartConfig,
    percentageValue: number,
    percentageLabel: string
}

const NewsletterRadialChart:React.FC<NewsletterRadialChartProps> = ({
    config,
    data,
    percentageValue,
    percentageLabel
}) => {
    const chartComponentConfig = {
        innerRadius: 72,
        outerRadius: 110,
        startAngle: -90,
        endAngle: 270
    };

    return (
        <ChartContainer
            className='mx-auto aspect-square max-h-[250px]'
            config={config}
        >
            <Recharts.RadialBarChart
                data={data}
                endAngle={chartComponentConfig.endAngle}
                innerRadius={chartComponentConfig.innerRadius}
                outerRadius={chartComponentConfig.outerRadius}
                startAngle={chartComponentConfig.startAngle}
            >
                <Recharts.PolarAngleAxis angleAxisId={0} domain={[0, 100]} tick={false} type="number" />
                <Recharts.RadialBar
                    cornerRadius={10}
                    dataKey="value"
                    background
                >
                    <Recharts.LabelList
                        className="fill-white capitalize mix-blend-luminosity"
                        dataKey="datatype"
                        fontSize={11}
                        position="insideStart"
                    />
                </Recharts.RadialBar>
                <Recharts.PolarRadiusAxis axisLine={false} tick={false} tickLine={false}>
                    <Recharts.Label
                        content={({viewBox}) => {
                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                return (
                                    <text
                                        dominantBaseline="middle"
                                        textAnchor="middle"
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                    >
                                        <tspan
                                            className="fill-foreground text-[2.6rem] font-semibold"
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                        >
                                            {formatPercentage(percentageValue)}
                                        </tspan>
                                        <tspan
                                            className="fill-muted-foreground font-medium"
                                            x={viewBox.cx}
                                            y={(viewBox.cy || 0) + 24}
                                        >
                                            {percentageLabel}
                                        </tspan>
                                    </text>
                                );
                            }
                        }}
                    />
                </Recharts.PolarRadiusAxis>
                <ChartTooltip
                    content={<ChartTooltipContent nameKey="datatype" hideLabel />}
                    cursor={false}
                />
            </Recharts.RadialBarChart>
        </ChartContainer>
    );
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

    // "Sent" Chart
    const sentChartData: NewsletterRadialChartData[] = [
        {datatype: 'average', value: 100, fill: 'hsl(var(--chart-darkgray))'},
        {datatype: 'This newsletter', value: 100, fill: 'hsl(var(--chart-purple))'}
    ];

    const sentChartConfig = {
        percentage: {
            label: 'O'
        },
        average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    // "Opened" Chart
    const openedChartData: NewsletterRadialChartData[] = [
        {datatype: 'average', value: averageStats.openedRate * 100, fill: 'hsl(var(--chart-darkgray))'},
        {datatype: 'This newsletter', value: stats.openedRate * 100, fill: 'hsl(var(--chart-blue))'}
    ];

    const openedChartConfig = {
        percentage: {
            label: 'O'
        },
        average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    // "Clicked" Chart
    const clickedChartData: NewsletterRadialChartData[] = [
        {datatype: 'average', value: averageStats.clickedRate * 100, fill: 'hsl(var(--chart-darkgray))'},
        {datatype: 'This newsletter', value: stats.clickedRate * 100, fill: 'hsl(var(--chart-green))'}
    ];

    const clickedChartConfig = {
        percentage: {
            label: 'O'
        },
        average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    return (
        <>
            <PostAnalyticsHeader currentTab='Newsletter' />
            <PostAnalyticsContent>
                {isLoading ?
                    <div className='flex size-full grow items-center justify-center'>
                        <BarChartLoadingIndicator />
                    </div>
                    :
                    <div className='flex flex-col items-stretch gap-6'>
                        <Card>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className='-mx-6 flex items-stretch border-b'>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.Send strokeWidth={1.5} />
                                            Sent
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.sent)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.MailOpen strokeWidth={1.5} />
                                            Opened
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.opened)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <LucideIcon.MousePointerClick strokeWidth={1.5} />
                                            Clicked
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.clicked)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                                <div className='grid grid-cols-3 items-center justify-center'>
                                    <div>
                                        <NewsletterRadialChart
                                            config={sentChartConfig}
                                            data={sentChartData}
                                            percentageLabel='Sent'
                                            percentageValue={1}
                                        />
                                    </div>
                                    <div>
                                        <NewsletterRadialChart
                                            config={openedChartConfig}
                                            data={openedChartData}
                                            percentageLabel='Opened'
                                            percentageValue={stats.openedRate}
                                        />
                                    </div>
                                    <div>
                                        <NewsletterRadialChart
                                            config={clickedChartConfig}
                                            data={clickedChartData}
                                            percentageLabel='Clicked'
                                            percentageValue={stats.clickedRate}
                                        />
                                    </div>
                                </div>
                                {/* <ChartContainer className='mt-10 max-h-[320px] w-full' config={chartConfig}>
                                    <Recharts.BarChart barCategoryGap={24} data={chartData} accessibilityLayer>
                                        <Recharts.CartesianGrid vertical={false} />
                                        <Recharts.YAxis
                                            axisLine={false}
                                            domain={barDomain}
                                            tickFormatter={value => formatPercentage(value)}
                                            tickLine={false}
                                            ticks={barTicks}
                                            width={calculateYAxisWidth(barTicks, (value: number) => formatPercentage(value))}
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
                                </ChartContainer> */}
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
        </>
    );
};

export default Newsletter;
