import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {AlignedAxisTick, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H3, KpiCardHeader, KpiCardHeaderContent, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn, formatDisplayDateWithRange, formatNumber, formatQueryDate, getRangeDates, getYRange, sanitizeChartData} from '@tryghost/shade';
import {getAudienceQueryParam} from './components/AudienceSelect';
import {getStatEndpointUrl, getToken, useNavigate} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';
// import {useTopContent} from '@tryghost/admin-x-framework/api/stats';

interface OverviewKPICardProps {
    linkto: string;
    title: string;
    iconName: keyof typeof LucideIcon;
    description: string;
    diffDirection?: 'up' | 'down' | 'same';
    diffValue?: string;
    color?: string;
    formattedValue: string;
    children?: React.ReactNode;
}

const OverviewKPICard: React.FC<OverviewKPICardProps> = ({
    linkto,
    title,
    iconName,
    description,
    // color,
    diffDirection,
    diffValue,
    formattedValue,
    children
}) => {
    const navigate = useNavigate();
    const IconComponent = LucideIcon[iconName] as LucideIcon.LucideIcon;

    return (
        <Card className='hover:cursor-pointer hover:bg-accent' onClick={() => {
            navigate(linkto);
        }}>
            <CardHeader className='hidden'>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <KpiCardHeader className='grow border-none pb-2'>
                <KpiCardHeaderLabel>
                    {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
                    {title}
                </KpiCardHeaderLabel>
                <KpiCardHeaderContent>
                    <KpiCardHeaderValue
                        diffDirection={diffDirection}
                        diffValue={diffValue}
                        value={formattedValue}
                    />
                </KpiCardHeaderContent>
            </KpiCardHeader>
            <CardContent>
                {children}
            </CardContent>
        </Card>
    );
};

interface PostTableCellProps {
    featureImage?: string;
    title: string;
    publishDate: string;
}

const PostTableCell: React.FC<PostTableCellProps> = ({
    featureImage,
    title,
    publishDate
}) => {
    return (
        <div className='flex items-center gap-3 py-1 pl-1 text-sm'>
            <div className='h-14 w-20 min-w-20 rounded-md bg-cover' style={{
                backgroundImage: featureImage
            }}></div>
            <div className='flex flex-col gap-0.5 leading-tight'>
                <span className='font-semibold'>{title}</span>
                <span className='text-sm font-normal text-muted-foreground'>{publishDate}</span>
            </div>
        </div>
    );
};

interface HelpCardProps {
    className?: string;
    title: string;
    description: string;
    url: string;
    children?: React.ReactNode;
}

const HelpCard: React.FC<HelpCardProps> = ({
    className,
    title,
    description,
    url,
    children
}) => {
    return (
        <a className={cn(
            'block rounded-xl border bg-card p-6 transition-all hover:shadow-xs hover:bg-accent group/card',
            className
        )} href={url} rel='noreferrer' target='_blank'>
            <div className='flex items-center gap-6'>
                {children}
                <div className='flex flex-col gap-0.5 leading-tight'>
                    <span className='text-base font-semibold'>{title}</span>
                    <span className='text-sm font-normal text-muted-foreground'>{description}</span>
                </div>
            </div>
        </a>
    );
};

interface WebKpiDataItem {
    date: string;
    [key: string]: string | number;
}

const Overview: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data: visitorsData, loading: visitorsLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params
    });

    const visitorsChartData = sanitizeChartData<WebKpiDataItem>(visitorsData as WebKpiDataItem[] || [], range, 'visits' as keyof WebKpiDataItem, 'sum')?.map((item: WebKpiDataItem) => {
        const value = Number(item.visits);
        return {
            date: String(item.date),
            value,
            formattedValue: formatNumber(value),
            label: 'Visitors'
        };
    });

    const isLoading = isConfigLoading || visitorsLoading;

    // Calculate KPI values
    const getKpiValues = () => {
        // Visitors data
        if (!visitorsData?.length) {
            return {visits: 0};
        }

        const totalVisits = visitorsData.reduce((sum, item) => sum + Number(item.visits), 0);

        return {
            visits: formatNumber(totalVisits)
        };
    };

    const kpiValues = getKpiValues();

    const visitorsChartConfig = {
        value: {
            label: 'Visitors'
        }
    } satisfies ChartConfig;

    const yRange = [getYRange(visitorsChartData).min, getYRange(visitorsChartData).max];

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect />
            </StatsHeader>
            <StatsView isLoading={isLoading}>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
                    <OverviewKPICard
                        description='Number of individual people who visited your website'
                        diffDirection='down'
                        diffValue='-2.4%'
                        formattedValue={kpiValues.visits}
                        iconName='MousePointer'
                        linkto='/web/'
                        title='Unique visitors'
                    >
                        <ChartContainer className='-mb-3 h-[10vw] max-h-[240px] w-full' config={visitorsChartConfig}>
                            <Recharts.AreaChart
                                data={visitorsChartData}
                                margin={{
                                    left: 4,
                                    right: 4,
                                    top: 0
                                }}
                            >
                                <Recharts.CartesianGrid horizontal={false} vertical={false} />
                                <Recharts.XAxis
                                    axisLine={{stroke: 'hsl(var(--border))', strokeWidth: 1}}
                                    dataKey="date"
                                    interval={0}
                                    tick={props => <AlignedAxisTick {...props} formatter={value => formatDisplayDateWithRange(value, range)} />}
                                    tickFormatter={value => formatDisplayDateWithRange(value, range)}
                                    tickLine={false}
                                    tickMargin={10}
                                    ticks={visitorsChartData && visitorsChartData.length > 0 ? [visitorsChartData[0].date, visitorsChartData[visitorsChartData.length - 1].date] : []}
                                />
                                <Recharts.YAxis
                                    axisLine={false}
                                    domain={yRange}
                                    scale="linear"
                                    tickFormatter={(value) => {
                                        return formatNumber(value);
                                    }}
                                    tickLine={false}
                                    ticks={[]}
                                    width={0}
                                />
                                <ChartTooltip
                                    content={<CustomTooltipContent color={'hsl(var(--chart-blue))'} range={range} />}
                                    cursor={true}
                                    isAnimationActive={false}
                                    position={{y: 10}}
                                />
                                <defs>
                                    <linearGradient id="fillChart" x1="0" x2="0" y1="0" y2="1">
                                        <stop
                                            offset="5%"
                                            stopColor={'hsl(var(--chart-blue))'}
                                            stopOpacity={0.8}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={'hsl(var(--chart-blue))'}
                                            stopOpacity={0.1}
                                        />
                                    </linearGradient>
                                </defs>
                                <Recharts.Area
                                    dataKey="value"
                                    fill="url(#fillChart)"
                                    fillOpacity={0.2}
                                    isAnimationActive={false}
                                    stackId="a"
                                    stroke={'hsl(var(--chart-blue))'}
                                    strokeWidth={2}
                                    type="linear"
                                />
                            </Recharts.AreaChart>
                        </ChartContainer>
                    </OverviewKPICard>

                    <OverviewKPICard
                        description='How number of members of your publication changed over time'
                        diffDirection='up'
                        diffValue='1.1%'
                        formattedValue='31,329'
                        iconName='User'
                        linkto='/growth/'
                        title='Members'
                    >
                        Chart
                    </OverviewKPICard>

                    <OverviewKPICard
                        description='Monthly recurring revenue changes over time'
                        diffDirection='up'
                        diffValue='1.2%'
                        formattedValue='$2,456'
                        iconName='DollarSign'
                        linkto='/growth/'
                        title='MRR'
                    >
                        Chart
                    </OverviewKPICard>
                </div>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
                    <Card className='group/card'>
                        <CardHeader>
                            <CardTitle className='flex items-baseline justify-between leading-snug'>
                                Latest post performance
                                <Button className='-translate-x-2 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100' variant='outline'>
                                    Details
                                    <LucideIcon.ArrowRight size={16} strokeWidth={1.5} />
                                </Button>
                            </CardTitle>
                            <CardDescription className='hidden'>How your last post did</CardDescription>
                        </CardHeader>
                        <CardContent className='flex flex-col items-stretch gap-6'>
                            <div className='flex flex-col items-stretch gap-2'>
                                <div className='aspect-video w-full rounded-md bg-cover' style={{
                                    backgroundImage: 'url(https://picsum.photos/1920/1080?random)'
                                }}></div>
                                <div className='mt-1 font-semibold leading-tight'>The Rise of DIY Synth Culture: Building Your First Rig</div>
                                <div className='text-sm text-muted-foreground'>Published and sent 5 days ago</div>
                            </div>
                            <div className='flex flex-col items-stretch gap-2 text-sm'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                        <LucideIcon.MousePointer size={16} strokeWidth={1.5} />
                                        Visitors
                                    </div>
                                    <div className='font-mono'>1,234</div>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                        <LucideIcon.MailOpen size={16} strokeWidth={1.5} />
                                        Open rate
                                    </div>
                                    <div className='font-mono'>71%</div>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-1 font-medium text-muted-foreground'>
                                        <LucideIcon.User size={16} strokeWidth={1.5} />
                                        Members
                                    </div>
                                    <div className='font-mono'>+3</div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className='flex items-center justify-between gap-3'>
                            <Button><LucideIcon.Share /> Share post</Button>
                        </CardFooter>
                    </Card>
                    <Card className='group/card lg:col-span-2'>
                        <CardHeader>
                            <CardTitle className='flex items-baseline justify-between leading-snug'>
                                Top posts in the last 30 days
                                <Button className='-translate-x-2 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100' variant='outline'>
                                    View all
                                    <LucideIcon.ArrowRight size={16} strokeWidth={1.5} />
                                </Button>
                            </CardTitle>
                            <CardDescription className='hidden'>Best performing post in the period</CardDescription>
                        </CardHeader>
                        <CardContent className='-mt-4'>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='pl-0'>Post title</TableHead>
                                        <TableHead className='text-right'>Visitors</TableHead>
                                        <TableHead className='whitespace-nowrap text-right'>Open rate</TableHead>
                                        <TableHead className='text-right'>Members</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">
                                            <PostTableCell
                                                featureImage='url(https://picsum.photos/1920/1080?random?v=1)'
                                                publishDate='13 days ago'
                                                title='The Rise of DIY Synth Culture: Building Your First Rig'
                                            />
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>2,345</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>56%</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+2</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">
                                            <PostTableCell
                                                featureImage='url(https://picsum.photos/1920/1080?random?v=2)'
                                                publishDate='13 days ago'
                                                title='Sculpting Sound: A Deep Dive into Modern Synthesizers'
                                            />
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>2,345</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>56%</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+2</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">
                                            <PostTableCell
                                                featureImage='url(https://picsum.photos/1920/1080?random?v=3)'
                                                publishDate='13 days ago'
                                                title='From Voltage to Vibe: How Analog Synths Shape Sound'
                                            />
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>2,345</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>56%</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+2</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">
                                            <PostTableCell
                                                featureImage='url(https://picsum.photos/1920/1080?random?v=4)'
                                                publishDate='13 days ago'
                                                title='Digital vs. Analog: The Great Synth Showdown'
                                            />
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>2,345</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>56%</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+2</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">
                                            <PostTableCell
                                                featureImage='url(https://picsum.photos/1920/1080?random?v=5)'
                                                publishDate='13 days ago'
                                                title='Inside the Patchbay: Creative Routing Techniques for Unique Sounds'
                                            />
                                        </TableCell>
                                        <TableCell className='text-right font-mono text-sm'>2,345</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>56%</TableCell>
                                        <TableCell className='text-right font-mono text-sm'>+2</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
                    <H3 className='-mb-4 mt-4 lg:col-span-2'>Grow your audience</H3>
                    <HelpCard
                        description='Find out how to review the performance of your content and get the most out of post analytics in Ghost.'
                        title='Analytics in Ghost'
                        url='https://ghost.org/help'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.Sprout className='text-green' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                    <HelpCard
                        description='Use these content distribution tactics to get more people to discover your work and increase engagement.'
                        title='How to reach more people?'
                        url='https://ghost.org/help'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.ChartColumnIncreasing className='text-blue' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Overview;