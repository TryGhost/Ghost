// import AudienceSelect from './components/AudienceSelect';
import KpiCard, {KpiCardContent, KpiCardLabel, KpiCardValue} from '../components/KpiCard';
import PostAnalyticsContent from '../components/PostAnalyticsContent';
import PostAnalyticsHeader from '../components/PostAnalyticsHeader';
import {BarChartLoadingIndicator, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Input, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, calculateYAxisWidth, formatNumber, formatPercentage} from '@tryghost/shade';
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
        startAngle: 90,
        endAngle: -270
    };

    return (
        <ChartContainer
            className='mx-auto my-14 aspect-square max-h-[250px]'
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
                    minPointSize={-2}
                    background
                >
                    <Recharts.LabelList
                        className="capitalize"
                        dataKey="datatype"
                        fontSize={11}
                        formatter={(value: string) => {
                            let className = '';

                            if (value === 'average') {
                                className = 'fill-muted-foreground';
                            } else if (data[1].value < 17) {
                                className = 'fill-[#515151] mix-blend-exclusion';
                            } else {
                                className = 'fill-white';
                            }

                            return (
                                <tspan className={`font-medium capitalize ${className}`}>{value}</tspan>
                            );
                        }}
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
                                            className="fill-foreground text-[2.6rem] font-semibold tracking-tight"
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
                    content={<ChartTooltipContent
                        formatter={(value, _, props) => {
                            return (
                                <div className='flex items-center gap-1'>
                                    <div className='size-2.5 rounded-[2px]' style={{backgroundColor: props.payload?.fill}}></div>
                                    <div className='text-xs capitalize text-muted-foreground'>{props.payload?.datatype}</div>
                                    <div className='ml-3 font-mono text-xs'>{value}%</div>
                                </div>
                            );
                        }}
                        nameKey="datatype"
                        hideLabel
                    />}
                    cursor={false}
                />
            </Recharts.RadialBarChart>
        </ChartContainer>
    );
};

const FunnelArrow: React.FC = () => {
    return (
        <div className='absolute right-[-13px] top-1/2 flex size-[25px] -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground'>
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

    const {data: {posts: [post]} = {posts: []}, isLoading: isPostLoading} = useBrowsePosts({
        searchParams: {
            filter: `id:${postId}`,
            fields: 'title,slug,published_at,uuid,email,status'
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
            color: 'hsl(var(--chart-1))'
        },
        average: {
            label: 'Average',
            color: 'hsl(var(--chart-gray))'
        }
    } satisfies ChartConfig;

    const isLoading = isNewsletterStatsLoading || isPostLoading;

    // "Sent" Chart
    // const sentChartData: NewsletterRadialChartData[] = [
    //     {datatype: 'average', value: 100, fill: 'hsl(var(--chart-gray))'},
    //     {datatype: 'This newsletter', value: 100, fill: 'hsl(var(--chart-purple))'}
    // ];

    // const sentChartConfig = {
    //     percentage: {
    //         label: 'O'
    //     },
    //     average: {
    //         label: 'Average'
    //     },
    //     'This newsletter': {
    //         label: 'This newsletter'
    //     }
    // } satisfies ChartConfig;

    // "Opened" Chart
    const openedChartData: NewsletterRadialChartData[] = [
        {datatype: 'average', value: averageStats.openedRate * 100, fill: 'hsl(var(--chart-gray))'},
        {datatype: 'This newsletter', value: stats.openedRate * 100, fill: 'hsl(var(--chart-blue))'}
    ];

    const openedChartConfig = {
        percentage: {
            label: 'Opened'
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
        {datatype: 'average', value: averageStats.clickedRate * 100, fill: 'hsl(var(--chart-gray))'},
        {datatype: 'This newsletter', value: stats.clickedRate * 100, fill: 'hsl(var(--chart-green))'}
    ];

    const clickedChartConfig = {
        percentage: {
            label: 'Clicked'
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
                            <CardContent className='p-0'>
                                <div className='grid grid-cols-3 items-stretch border-b'>
                                    <KpiCard className='relative grow'>
                                        <KpiCardLabel>
                                            {/* <div className='size-2.5 rounded-full bg-purple/30'></div> */}
                                            <LucideIcon.Send strokeWidth={1.5} />
                                            Sent
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.sent)}</KpiCardValue>
                                        </KpiCardContent>
                                        <FunnelArrow />
                                    </KpiCard>
                                    <KpiCard className='relative grow'>
                                        <KpiCardLabel>
                                            {/* <div className='size-2.5 rounded-full bg-blue/30'></div> */}
                                            <LucideIcon.Eye strokeWidth={1.5} />
                                            Opened
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.opened)}</KpiCardValue>
                                            <span className='mt-0.5 text-sm text-muted-foreground'>{formatPercentage(stats.openedRate)} open rate</span>
                                        </KpiCardContent>
                                        <FunnelArrow />
                                    </KpiCard>
                                    <KpiCard className='grow'>
                                        <KpiCardLabel>
                                            {/* <div className='size-2.5 rounded-full bg-green/30'></div> */}
                                            <LucideIcon.MousePointer strokeWidth={1.5} />
                                            Clicked
                                        </KpiCardLabel>
                                        <KpiCardContent>
                                            <KpiCardValue>{formatNumber(stats.clicked)}</KpiCardValue>
                                            <span className='mt-0.5 text-sm text-muted-foreground'>{formatPercentage(stats.clickedRate)} click rate</span>
                                        </KpiCardContent>
                                    </KpiCard>
                                </div>
                                <Tabs className="relative" defaultValue="radial">
                                    <TabsList className="absolute right-3 top-3 grid grid-cols-2">
                                        <TabsTrigger value="radial"><LucideIcon.LoaderCircle /></TabsTrigger>
                                        <TabsTrigger value="bar"><LucideIcon.ChartNoAxesColumnDecreasing /></TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="radial">
                                        <div className='mx-auto flex flex-wrap items-center justify-center lg:gap-[10vw] lg:py-[3vw]'>
                                            {/* <div className='border-r px-6'>
                                                <NewsletterRadialChart
                                                    config={sentChartConfig}
                                                    data={sentChartData}
                                                    percentageLabel='Sent'
                                                    percentageValue={1}
                                                />
                                            </div> */}
                                            <div className='min-w-[250px] px-6'>
                                                <NewsletterRadialChart
                                                    config={openedChartConfig}
                                                    data={openedChartData}
                                                    percentageLabel='Opened'
                                                    percentageValue={stats.openedRate}
                                                />
                                            </div>
                                            <div className='min-w-[250px] px-6'>
                                                <NewsletterRadialChart
                                                    config={clickedChartConfig}
                                                    data={clickedChartData}
                                                    percentageLabel='Clicked'
                                                    percentageValue={stats.clickedRate}
                                                />
                                            </div>
                                        </div>
                                        {/* <div className='flex flex-wrap items-center justify-center gap-6 p-6 text-xs text-muted-foreground'>
                                            <div className='flex items-center gap-1'>
                                                <div className='size-2.5 rounded-sm bg-blue'></div>
                                                <span>Opened this newsletter</span>
                                            </div>
                                            <div className='flex items-center gap-1'>
                                                <div className='size-2.5 rounded-sm bg-green'></div>
                                                <span>Clicked this newsletter</span>
                                            </div>
                                            <div className='flex items-center gap-1'>
                                                <div className='size-2.5 rounded-[3px] bg-gray-500'></div>
                                                <span>Average</span>
                                            </div>
                                        </div> */}
                                    </TabsContent>
                                    <TabsContent value="bar">
                                        <div>
                                            <ChartContainer className='max-h-[380px] w-full pb-6 pt-14' config={barChartConfig}>
                                                <Recharts.BarChart barCategoryGap={24} data={barChartData} accessibilityLayer>
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
                                                                                    'hsl(var(--chart-1))'
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
                                                        fill="hsl(var(--chart-1))"
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
                                                                                'hsl(var(--chart-1))'
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
                                            {topLinks.map((row) => {
                                                const linkId = row.link.link_id;
                                                const title = row.link.title;
                                                const url = row.link.to;
                                                const edited = row.link.edited;

                                                return (
                                                    <TableRow key={linkId}>
                                                        <TableCell className='max-w-0'>
                                                            <div className='flex items-center gap-2'>
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
                                                        </TableCell>
                                                        <TableCell className='text-right font-mono text-sm'>{formatNumber(row.count)}</TableCell>
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
