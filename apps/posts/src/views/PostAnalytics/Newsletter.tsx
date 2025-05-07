import AudienceSelect from './components/AudienceSelect';
import KpiCard, {KpiCardContent, KpiCardIcon, KpiCardLabel, KpiCardValue} from './components/KpiCard';
import PostAnalyticsContent from './components/PostAnalyticsContent';
import PostAnalyticsHeader from './components/PostAnalyticsHeader';
import PostAnalyticsLayout from './layout/PostAnalyticsLayout';
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, Input, LucideIcon, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, ViewHeaderActions, formatNumber, formatPercentage} from '@tryghost/shade';
import {Navigate} from '@tryghost/admin-x-framework';
import {calculateYAxisWidth} from '@src/utils/chart-helpers';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {useEffect, useRef, useState} from 'react';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

interface postAnalyticsProps {}

const sanitizeUrl = (url: string): string => {
    return url.replace(/^https?:\/\//, '');
};

const Newsletter: React.FC<postAnalyticsProps> = () => {
    const [editingUrl, setEditingUrl] = useState<string | null>(null);
    const [editedUrl, setEditedUrl] = useState('');
    const [originalUrl, setOriginalUrl] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    // const {isLoading: isConfigLoading} = useGlobalData();
    // const {postId} = useParams();
    // const {stats: postReferrers, totals, isLoading} = usePostReferrers(postId || '');

    const handleEdit = (url: string) => {
        setEditingUrl(url);
        setEditedUrl(url);
        setOriginalUrl(url);
    };

    // TODO: API calls to update URL
    const handleUpdate = () => {
        setEditingUrl(null);
        setEditedUrl('');
        setOriginalUrl('');
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

    const isLoading = false;

    const barDomain = [0, 1];
    const barTicks = [0, 0.25, 0.5, 0.75, 1];
    const chartData = [
        {metric: 'Opened', current: 0.73, average: 0.64},
        {metric: 'Clicked', current: 0.26, average: 0.08}
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

    const mockLinks = [
        {
            url: 'https://google.com',
            clicks: 199
        },
        {
            url: 'https://ghost.org/docs/content-api/javascript/',
            clicks: 74
        },
        {
            url: 'https://bsky.app/',
            clicks: 12
        },
        {
            url: 'https://activitypub.ghost.org/you-think-youre-following-us-but-you-might-not-be/',
            clicks: 1
        }
    ];

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
                                            <KpiCardValue>{formatNumber(47968)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.MailOpen strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Opened</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(24865)}</KpiCardValue>
                                        </KpiCardContent>
                                    </KpiCard>
                                    <KpiCard className='border-none p-0'>
                                        <KpiCardIcon>
                                            <LucideIcon.MousePointerClick strokeWidth={1.5} />
                                        </KpiCardIcon>
                                        <KpiCardContent>
                                            <KpiCardLabel>Clicked</KpiCardLabel>
                                            <KpiCardValue>{formatNumber(1094)}</KpiCardValue>
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
                                {mockLinks.length > 0
                                    ?
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Link</TableHead>
                                                <TableHead className='text-right'>No. of members</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mockLinks?.map(row => (
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
