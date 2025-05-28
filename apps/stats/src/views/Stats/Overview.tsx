import AreaChart, {AreaChartDataItem} from './components/AreaChart';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo} from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, H3, KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue, LucideIcon, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, centsToDollars, cn, formatNumber, formatQueryDate, getRangeDates, sanitizeChartData} from '@tryghost/shade';
import {getAudienceQueryParam} from './components/AudienceSelect';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useGrowthStats} from '@src/hooks/useGrowthStats';
import {useQuery} from '@tinybirdco/charts';
// import {useTopContent} from '@tryghost/admin-x-framework/api/stats';

interface OverviewKPICardProps {
    linkto: string;
    title: string;
    iconName: keyof typeof LucideIcon;
    description: string;
    diffDirection?: 'up' | 'down' | 'same' | 'empty';
    diffValue?: string;
    color?: string;
    formattedValue: string;
    children?: React.ReactNode;
}

const OverviewKPICard: React.FC<OverviewKPICardProps> = ({
    // linkto,
    title,
    iconName,
    description,
    // color,
    diffDirection,
    diffValue,
    formattedValue,
    children
}) => {
    // const navigate = useNavigate();
    const IconComponent = LucideIcon[iconName] as LucideIcon.LucideIcon;

    return (
        <Card>
            <CardHeader className='hidden'>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <KpiCardHeader className='grow gap-2 border-none pb-2'>
                <KpiCardHeaderLabel>
                    {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
                    {title}
                </KpiCardHeaderLabel>
                <KpiCardHeaderValue
                    diffDirection={diffDirection}
                    diffValue={diffValue}
                    value={formattedValue}
                />
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

type GrowthChartDataItem = {
    date: string;
    value: number;
    free: number;
    paid: number;
    comped: number;
    mrr: number;
    formattedValue: string;
    label?: string;
};

const Overview: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const {isLoading: isGrowthStatsLoading, chartData: growthChartData, totals: growthTotals} = useGrowthStats(range);

    /* Get visitors
    /* ---------------------------------------------------------------------- */
    const visitorsParams = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data: visitorsData, loading: isVisitorsLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params: visitorsParams
    });

    const visitorsChartData = useMemo(() => {
        return sanitizeChartData<WebKpiDataItem>(visitorsData as WebKpiDataItem[] || [], range, 'visits' as keyof WebKpiDataItem, 'sum')?.map((item: WebKpiDataItem) => {
            const value = Number(item.visits);
            return {
                date: String(item.date),
                value,
                formattedValue: formatNumber(value),
                label: 'Visitors'
            };
        });
    }, [visitorsData, range]);
    const visitorsYRange: [number, number] = [0, Math.max(...(visitorsChartData?.map((item: AreaChartDataItem) => item.value) || [0]))];

    /* Get members
    /* ---------------------------------------------------------------------- */
    // Create chart data based on selected tab
    const membersChartData = useMemo(() => {
        if (!growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'value';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: AreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: item.free + item.paid + item.comped,
            formattedValue: formatNumber(item.free + item.paid + item.comped),
            label: 'Members'
        }));

        return processedData;
    }, [growthChartData, range]);

    /* Get MRR
    /* ---------------------------------------------------------------------- */
    // Create chart data based on selected tab
    const mrrChartData = useMemo(() => {
        if (!growthChartData || growthChartData.length === 0) {
            return [];
        }

        let sanitizedData: GrowthChartDataItem[] = [];
        const fieldName: keyof GrowthChartDataItem = 'mrr';

        sanitizedData = sanitizeChartData<GrowthChartDataItem>(growthChartData, range, fieldName, 'exact');

        // Then map the sanitized data to the final format
        const processedData: AreaChartDataItem[] = sanitizedData.map(item => ({
            date: item.date,
            value: centsToDollars(item.mrr),
            formattedValue: `$${formatNumber(centsToDollars(item.mrr))}`,
            label: 'MRR'
        }));

        return processedData;
    }, [growthChartData, range]);

    /* Calculate KPI values
    /* ---------------------------------------------------------------------- */
    const kpiValues = useMemo(() => {
        // Visitors data
        if (!visitorsData?.length) {
            return {visits: '0'};
        }

        const totalVisits = visitorsData.reduce((sum, item) => sum + Number(item.visits), 0);

        return {
            visits: formatNumber(totalVisits)
        };
    }, [visitorsData]);

    const isLoading = isConfigLoading || isVisitorsLoading || isGrowthStatsLoading;
    const areaChartClassName = '-mb-3 h-[10vw] max-h-[200px]';

    return (
        <StatsLayout>
            <StatsHeader>
                <DateRangeSelect />
            </StatsHeader>
            <StatsView isLoading={isLoading}>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-3'>
                    <OverviewKPICard
                        description='Number of individual people who visited your website'
                        diffDirection='empty'
                        formattedValue={kpiValues.visits}
                        iconName='MousePointer'
                        linkto='/web/'
                        title='Unique visitors'
                    >
                        <AreaChart
                            className={areaChartClassName}
                            color='hsl(var(--chart-blue))'
                            data={visitorsChartData}
                            id="visitors"
                            range={range}
                            showYAxisValues={false}
                            syncId="overview-charts"
                            yAxisRange={visitorsYRange}
                        />
                    </OverviewKPICard>

                    <OverviewKPICard
                        description='How number of members of your publication changed over time'
                        diffDirection={growthTotals.directions.total}
                        diffValue={growthTotals.percentChanges.total}
                        formattedValue={formatNumber(growthTotals.totalMembers)}
                        iconName='User'
                        linkto='/growth/'
                        title='Members'
                    >
                        <AreaChart
                            allowDataOverflow={true}
                            className={areaChartClassName}
                            color='hsl(var(--chart-green))'
                            data={membersChartData}
                            id="members"
                            range={range}
                            showYAxisValues={false}
                            syncId="overview-charts"
                        />
                    </OverviewKPICard>

                    <OverviewKPICard
                        description='Monthly recurring revenue changes over time'
                        diffDirection={growthTotals.directions.mrr}
                        diffValue={growthTotals.percentChanges.mrr}
                        formattedValue={`$${formatNumber(centsToDollars(growthTotals.mrr))}`}
                        iconName='DollarSign'
                        linkto='/growth/'
                        title='MRR'
                    >
                        <AreaChart
                            allowDataOverflow={true}
                            className={areaChartClassName}
                            color='hsl(var(--chart-orange))'
                            data={mrrChartData}
                            id="mrr"
                            range={range}
                            showYAxisValues={false}
                            syncId="overview-charts"
                        />
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
                            <LucideIcon.Sprout className='text-muted-foreground' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                    <HelpCard
                        description='Use these content distribution tactics to get more people to discover your work and increase engagement.'
                        title='How to reach more people?'
                        url='https://ghost.org/help'>
                        <div className='flex h-18 w-[100px] min-w-[100px] items-center justify-center rounded-md bg-gradient-to-r from-muted-foreground/15 to-muted-foreground/10 p-4 opacity-80 transition-all group-hover/card:opacity-100'>
                            <LucideIcon.ChartColumnIncreasing className='text-muted-foreground' size={40} strokeWidth={1} />
                        </div>
                    </HelpCard>
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Overview;