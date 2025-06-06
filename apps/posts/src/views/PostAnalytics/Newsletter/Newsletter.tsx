// import AudienceSelect from './components/AudienceSelect';
import Feedback from './components/Feedback';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Input, LucideIcon, Recharts, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPreviousButton, Tabs, TabsContent, calculateYAxisWidth, formatNumber, formatPercentage, useSimplePagination} from '@tryghost/shade';
import {Post, useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {getLinkById} from '@src/utils/link-helpers';
import {hasBeenEmailed, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {useEditLinks} from '@src/hooks/useEditLinks';
import {useEffect, useRef, useState} from 'react';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

interface postAnalyticsProps {}

type NewsletterRadialChartData = {
    datatype: string,
    value: number,
    fill: string,
    color: string
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
    percentageValue
}) => {
    const barWidth = 46;
    const innerRadiusStart = data.length > 1 ? 72 : 89;

    const chartComponentConfig = {
        innerRadius: innerRadiusStart,
        outerRadius: innerRadiusStart + barWidth,
        startAngle: 90,
        endAngle: -270
    };

    return (
        <ChartContainer
            className='mx-auto aspect-square'
            config={config}
        >
            <Recharts.RadialBarChart
                data={data}
                endAngle={chartComponentConfig.endAngle}
                innerRadius={chartComponentConfig.innerRadius}
                outerRadius={chartComponentConfig.outerRadius}
                startAngle={chartComponentConfig.startAngle}
            >
                <defs>
                    {/* Define gradients for each data type */}
                    <radialGradient cx="30%" cy="30%" id="gradientPurple" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-purple))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-purple))" stopOpacity={1} />
                    </radialGradient>
                    <radialGradient cx="30%" cy="30%" id="gradientBlue" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-blue))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-blue))" stopOpacity={1} />
                    </radialGradient>
                    <radialGradient cx="30%" cy="30%" id="gradientTeal" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-teal))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-teal))" stopOpacity={1} />
                    </radialGradient>
                    <radialGradient cx="30%" cy="30%" id="gradientGray" r="70%">
                        <stop offset="0%" stopColor="hsl(var(--chart-gray))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--chart-gray))" stopOpacity={1} />
                    </radialGradient>
                </defs>
                <Recharts.PolarAngleAxis angleAxisId={0} domain={[0, 1]} tick={false} type="number" />
                <Recharts.RadialBar
                    cornerRadius={10}
                    dataKey="value"
                    minPointSize={-2}
                    background
                >
                    {data.length > 1 &&
                        <Recharts.LabelList
                            className="fill-black opacity-60"
                            dataKey="datatype"
                            fontSize={11}
                            position="insideStart"
                        />
                    }
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
                                            className="fill-foreground text-[1.6rem] font-semibold tracking-tight"
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                        >
                                            {formatPercentage(percentageValue)}
                                        </tspan>
                                        {/* <tspan
                                                className="fill-muted-foreground font-medium"
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 24}
                                                >
                                                {percentageLabel}
                                                </tspan> */}
                                    </text>
                                );
                            }
                        }}
                    />
                </Recharts.PolarRadiusAxis>
                <ChartTooltip
                    content={<ChartTooltipContent
                        formatter={(value, _, props) => {
                            return (
                                <div className='flex items-center gap-1'>
                                    <div className='size-2 rounded-full opacity-50' style={{backgroundColor: props.payload?.color}}></div>
                                    <div className='text-xs text-muted-foreground'>{props.payload?.datatype}</div>
                                    <div className='ml-3 font-mono text-xs'>{formatPercentage(value)}</div>
                                </div>
                            );
                        }}
                        nameKey="datatype"
                        hideLabel
                    />}
                    cursor={false}
                    isAnimationActive={false}
                />
            </Recharts.RadialBarChart>
        </ChartContainer>
    );
};

const FunnelArrow: React.FC = () => {
    return (
        <div className='absolute -right-4 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground'>
            <LucideIcon.ChevronRight className='ml-0.5' size={16} strokeWidth={1.5}/>
        </div>
    );
};

const Newsletter: React.FC<postAnalyticsProps> = () => {
    const {postId} = useParams();
    const navigate = useNavigate();
    const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
    const [editedUrl, setEditedUrl] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const ITEMS_PER_PAGE = 5;

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid,status',
            include: 'email'
        }
    });

    const typedPost = post as Post;
    // Use the utility function from admin-x-framework
    const showNewsletterSection = hasBeenEmailed(typedPost);

    useEffect(() => {
        // Redirect to overview if the post wasn't sent as a newsletter
        if (!isPostLoading && !showNewsletterSection) {
            navigate(`/analytics/beta/${postId}`);
        }
    }, [navigate, postId, isPostLoading, showNewsletterSection]);

    const {stats, averageStats, topLinks, isLoading: isNewsletterStatsLoading, refetchTopLinks} = usePostNewsletterStats(postId || '');
    const {editLinks} = useEditLinks();

    const handleEdit = (linkId: string) => {
        const link = getLinkById(topLinks, linkId);
        if (link) {
            setEditingLinkId(linkId);
            setEditedUrl(link.link.to);
        }
    };

    const handleUpdate = () => {
        if (!editingLinkId) {
            return;
        }
        const link = getLinkById(topLinks, editingLinkId);
        if (!link) {
            return;
        }
        const trimmedUrl = editedUrl.trim();
        if (trimmedUrl === '' || trimmedUrl === link.link.to) {
            setEditingLinkId(null);
            setEditedUrl('');
            return;
        }
        editLinks({
            originalUrl: link.link.originalTo,
            editedUrl: editedUrl,
            postId: postId || ''
        }, {
            onSuccess: () => {
                setEditingLinkId(null);
                setEditedUrl('');
                refetchTopLinks();
            }
        });
    };

    // Pagination for topLinks
    const {
        totalPages,
        paginatedData: paginatedTopLinks,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage
    } = useSimplePagination({
        data: topLinks,
        itemsPerPage: ITEMS_PER_PAGE
    });

    useEffect(() => {
        if (editingLinkId && inputRef.current) {
            inputRef.current.focus();
            const link = getLinkById(topLinks, editingLinkId);

            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    if (editedUrl === link?.link.to) {
                        setEditingLinkId(null);
                        setEditedUrl('');
                    }
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [editingLinkId, editedUrl, topLinks]);

    const barDomain = [0, 1];
    const barTicks = [0, 0.25, 0.5, 0.75, 1];
    const barChartData = [
        // {metric: 'Sent', current: 1, average: 1},
        {metric: 'Opened', current: stats.openedRate, average: averageStats.openedRate},
        {metric: 'Clicked', current: stats.clickedRate, average: averageStats.clickedRate}
    ];
    const barChartConfig = {
        current: {
            label: 'This newsletter',
            color: 'hsl(var(--chart-blue))'
        },
        average: {
            label: 'Average',
            color: 'hsl(var(--chart-gray))'
        }
    } satisfies ChartConfig;

    const isLoading = isNewsletterStatsLoading || isPostLoading;

    // "Sent" Chart
    const sentChartData: NewsletterRadialChartData[] = [
        {datatype: 'Sent', value: 1, fill: 'url(#gradientPurple)', color: 'hsl(var(--chart-purple))'}
    ];

    const sentChartConfig = {
        percentage: {
            label: 'O'
        },
        Average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    // "Opened" Chart
    const openedChartData: NewsletterRadialChartData[] = [
        {datatype: 'Average', value: averageStats.openedRate, fill: 'url(#gradientGray)', color: 'hsl(var(--chart-gray))'},
        {datatype: 'This newsletter', value: stats.openedRate, fill: 'url(#gradientBlue)', color: 'hsl(var(--chart-blue))'}
    ];

    const openedChartConfig = {
        percentage: {
            label: 'Opened'
        },
        Average: {
            label: 'Average'
        },
        'This newsletter': {
            label: 'This newsletter'
        }
    } satisfies ChartConfig;

    // "Clicked" Chart
    const clickedChartData: NewsletterRadialChartData[] = [
        {datatype: 'Average', value: averageStats.clickedRate, fill: 'url(#gradientGray)', color: 'hsl(var(--chart-gray))'},
        {datatype: 'This newsletter', value: stats.clickedRate, fill: 'url(#gradientTeal)', color: 'hsl(var(--chart-teal))'}
    ];

    const clickedChartConfig = {
        percentage: {
            label: 'Clicked'
        },
        Average: {
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
                    <div className='grid grid-cols-2 gap-8'>
                        <Card className='col-span-2'>
                            <CardHeader className='hidden'>
                                <CardTitle>Newsletters</CardTitle>
                                <CardDescription>How did this post perform</CardDescription>
                            </CardHeader>
                            <CardContent className='p-0'>
                                <div className='grid grid-cols-3 items-stretch border-b'>
                                    <KpiCard className='relative grow'>
                                        <FunnelArrow />
                                        <KpiCardLabel>
                                            <div className='ml-0.5 size-[9px] rounded-full bg-chart-purple opacity-50'></div>
                                            {/* <LucideIcon.Send strokeWidth={1.5} /> */}
                                            Sent
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.sent)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='relative grow'>
                                        <FunnelArrow />
                                        <KpiCardLabel>
                                            <div className='ml-0.5 size-[9px] rounded-full bg-chart-blue opacity-50'></div>
                                            {/* <LucideIcon.Eye strokeWidth={1.5} /> */}
                                            Opened
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.opened)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            <div className='ml-0.5 size-[9px] rounded-full bg-chart-teal opacity-50'></div>
                                            {/* <LucideIcon.MousePointer strokeWidth={1.5} /> */}
                                            Clicked
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.clicked)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                                <Tabs className="relative" defaultValue="radial">
                                    {/* <TabsList className="absolute right-3 top-3 grid grid-cols-2">
                                        <TabsTrigger value="radial"><LucideIcon.LoaderCircle /></TabsTrigger>
                                        <TabsTrigger value="bar"><LucideIcon.ChartNoAxesColumnDecreasing /></TabsTrigger>
                                    </TabsList> */}
                                    <TabsContent value="radial">
                                        <div className='mx-auto grid grid-cols-3 items-center justify-center'>
                                            <div className='border-r px-6'>
                                                <NewsletterRadialChart
                                                    config={sentChartConfig}
                                                    data={sentChartData}
                                                    percentageLabel='Sent'
                                                    percentageValue={1}
                                                />
                                            </div>
                                            <div className='border-r px-6'>
                                                <NewsletterRadialChart
                                                    config={openedChartConfig}
                                                    data={openedChartData}
                                                    percentageLabel='Opened'
                                                    percentageValue={stats.openedRate}
                                                />
                                            </div>
                                            <div className='px-6'>
                                                <NewsletterRadialChart
                                                    config={clickedChartConfig}
                                                    data={clickedChartData}
                                                    percentageLabel='Clicked'
                                                    percentageValue={stats.clickedRate}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="bar">
                                        <div>
                                            <ChartContainer className='max-h-[380px] w-full pb-6 pt-14' config={barChartConfig}>
                                                <Recharts.BarChart barCategoryGap={24} data={barChartData}>
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
                                                                formatter={(value, name, props) => {
                                                                    const metric = props.payload.metric;
                                                                    const color = (name === 'average' ?
                                                                        'hsl(var(--chart-gray))'
                                                                        :
                                                                        metric === 'Sent' ? 'hsl(var(--chart-purple))' :
                                                                            metric === 'Opened' ? 'hsl(var(--chart-blue))' :
                                                                                metric === 'Clicked' ? 'hsl(var(--chart-green))' :
                                                                                    'hsl(var(--chart-blue))'
                                                                    );

                                                                    return (
                                                                        <>
                                                                            <div
                                                                                className="size-2.5 shrink-0 rounded-[2px]"
                                                                                style={{backgroundColor: color}}
                                                                            />
                                                                            {barChartConfig[name as keyof typeof barChartConfig]?.label || name}
                                                                            <div className="ml-auto flex items-baseline gap-0.5 pl-2 font-mono font-medium tabular-nums text-foreground">
                                                                                {formatPercentage(value)}
                                                                            </div>
                                                                        </>
                                                                    );
                                                                }}
                                                                hideLabel
                                                            />
                                                        }
                                                        cursor={false}
                                                    />
                                                    <Recharts.Bar
                                                        barSize={48}
                                                        dataKey="current"
                                                        fill="hsl(var(--chart-blue))"
                                                        minPointSize={2}
                                                        radius={0}
                                                    >
                                                        {barChartData.map(entry => (
                                                            <Recharts.Cell
                                                                key={`cell-${entry.metric}`}
                                                                fill={
                                                                    entry.metric === 'Sent' ? 'hsl(var(--chart-purple))' :
                                                                        entry.metric === 'Opened' ? 'hsl(var(--chart-blue))' :
                                                                            entry.metric === 'Clicked' ? 'hsl(var(--chart-green))' :
                                                                                'hsl(var(--chart-blue))'
                                                                }
                                                            />
                                                        ))}
                                                    </Recharts.Bar>
                                                    <Recharts.Bar
                                                        barSize={48}
                                                        dataKey="average"
                                                        fill="var(--color-average)"
                                                        minPointSize={2}
                                                        radius={0}
                                                    />
                                                    {/* <ChartLegend content={<ChartLegendContent />} /> */}
                                                </Recharts.BarChart>
                                            </ChartContainer>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                        <Feedback />
                        <Card>
                            <CardHeader className='pb-3'>
                                <CardTitle>Newsletter clicks</CardTitle>
                                <CardDescription>Which links resonated with your readers</CardDescription>
                            </CardHeader>
                            <CardContent className='pb-0'>
                                {topLinks.length > 0
                                    ?
                                    <>

                                        <div className='flex w-full flex-col'>
                                            <div className='flex h-12 w-full items-center justify-between border-b text-sm text-muted-foreground'>
                                                <div>Link</div>
                                                <div>No. of members</div>
                                            </div>
                                            <div className='flex w-full flex-col py-3'>
                                                {paginatedTopLinks?.map((row) => {
                                                    const linkId = row.link.link_id;
                                                    const title = row.link.title;
                                                    const url = row.link.to;
                                                    const edited = row.link.edited;

                                                    return (
                                                        <div key={linkId} className='flex h-10 w-full items-center justify-between gap-3 rounded-sm border-none px-2 text-sm hover:cursor-pointer hover:bg-accent'>
                                                            <div className='flex grow items-center gap-2 overflow-hidden'>
                                                                {editingLinkId === linkId ? (
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
                                                                            onClick={() => handleEdit(linkId)}
                                                                        >
                                                                            <LucideIcon.Pen />
                                                                        </Button>
                                                                        <a
                                                                            className='block truncate font-medium hover:underline'
                                                                            href={url}
                                                                            rel="noreferrer"
                                                                            target='_blank'
                                                                            title={title}
                                                                        >
                                                                            {title}
                                                                        </a>
                                                                        {edited && (
                                                                            <span className='text-xs text-gray-500'>(edited)</span>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className='font-mono'>
                                                                {formatNumber(row.count)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                    :
                                    <div className='py-20 text-center text-sm text-gray-700'>
                                    You have no links in your post.
                                    </div>
                                }
                            </CardContent>
                            {topLinks.length > 1 &&
                                <CardFooter>
                                    <div className='flex w-full items-start justify-between gap-3'>
                                        <div className='mt-1 flex items-start gap-2 pl-4 text-sm text-green'>
                                            <LucideIcon.ArrowUp size={20} strokeWidth={1.5} />
                                            Sent a broken link? You can update it!
                                        </div>
                                        {totalPages > 1 && (
                                            <SimplePagination className='pb-0'>
                                                <SimplePaginationNavigation>
                                                    <SimplePaginationPreviousButton
                                                        disabled={!hasPreviousPage}
                                                        onClick={previousPage}
                                                    />
                                                    <SimplePaginationNextButton
                                                        disabled={!hasNextPage}
                                                        onClick={nextPage}
                                                    />
                                                </SimplePaginationNavigation>
                                            </SimplePagination>
                                        )}
                                    </div>
                                </CardFooter>
                            }
                        </Card>
                    </div>
                }
            </PostAnalyticsContent>
        </>
    );
};

export default Newsletter;
