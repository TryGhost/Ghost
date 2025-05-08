import AudienceSelect from './components/AudienceSelect';
import KpiCard, {KpiCardContent, KpiCardIcon, KpiCardLabel, KpiCardValue} from './components/KpiCard';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, Input, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, ViewHeaderActions, formatNumber, formatPercentage} from '@tryghost/shade';
import {Navigate, useParams} from '@tryghost/admin-x-framework';
import {calculateYAxisWidth} from '@src/utils/chart-helpers';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useEditLinks} from '@src/hooks/useEditLinks';
import {useEffect, useRef, useState} from 'react';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';

interface postAnalyticsProps {}

const sanitizeUrl = (url: string): string => {
    return url.replace(/^https?:\/\//, '');
};

const Newsletter: React.FC<postAnalyticsProps> = () => {
    const {postId} = useParams();
    const [editingUrl, setEditingUrl] = useState<string | null>(null);
    const [editedUrl, setEditedUrl] = useState('');
    const [originalUrl, setOriginalUrl] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {settings} = useGlobalData();
    const {isLoading: isConfigLoading} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');

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

    const isLoading = isNewsletterStatsLoading || isConfigLoading;

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

    if (!labs.trafficAnalyticsAlpha) {
        return <Navigate to='/web/' />;
    }

    return (
        <PostAnalyticsLayout>
            <ViewHeader className='items-end pb-4'>
                <PostAnalyticsHeader currentTab='Newsletter' />
                <ViewHeaderActions className='mb-2'>
                    <AudienceSelect />
                </ViewHeaderActions>
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
                                            radius={0}
                                        />
                                        <Recharts.Bar
                                            barSize={48}
                                            dataKey="average"
                                            fill="var(--color-average)"
                                            radius={0}
                                        />
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </Recharts.BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Email clicks</CardTitle>
                                <CardDescription>Which links got the most clicks</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                {topLinks.length > 0
                                    ?
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Link</TableHead>
                                                <TableHead className='text-right'>No. of members</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topLinks?.map(row => (
                                                <TableRow key={row.url}>
                                                    <TableCell>
                                                        <div className='flex items-center gap-2'>
                                                            {editingUrl === row.url ? (
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
                                                                        className='bg-background'
                                                                        size='sm'
                                                                        variant='outline'
                                                                        onClick={() => handleEdit(row.url)}
                                                                    >
                                                                        <LucideIcon.Pen />
                                                                    </Button>
                                                                    <a
                                                                        className='inline-flex items-center gap-2 font-medium hover:underline'
                                                                        href={row.url}
                                                                        rel="noreferrer"
                                                                        target='_blank'
                                                                    >
                                                                        <span>{sanitizeUrl(row.url)}</span>
                                                                    </a>
                                                                    {row.edited && (
                                                                        <span className='text-xs text-gray-500'>(edited)</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>{formatNumber(row.clicks)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
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
