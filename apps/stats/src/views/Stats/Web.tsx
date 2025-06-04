import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, GhAreaChart, KpiTabTrigger, KpiTabValue, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, Tabs, TabsList, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates, getYRange, isValidDomain} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {SourceRow} from './Sources';
import {getPeriodText, sanitizeChartData} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useNavigate} from '@tryghost/admin-x-framework';
import {useQuery} from '@tinybirdco/charts';
import {useTopContent} from '@tryghost/admin-x-framework/api/stats';

// Define types for our page data
interface TopContentData {
    pathname: string;
    visits: number;
    title?: string;
    post_uuid?: string;
    post_id?: string;
    percentage?: number;
}

interface KpiDataItem {
    date: string;
    [key: string]: string | number;
}

interface SourcesData {
    source?: string | number;
    visits: string | number;
    [key: string]: unknown;
    percentage?: number;
}

const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visitors',
        chartColor: 'hsl(var(--chart-blue))',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        chartColor: 'hsl(var(--chart-green))',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        chartColor: 'hsl(var(--chart-green))',
        formatter: formatPercentage
    },
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        chartColor: 'hsl(var(--chart-green))',
        formatter: formatDuration
    }
};

interface WebKPIsProps {
    data: KpiDataItem[] | null;
    range: number;
}

const WebKPIs: React.FC<WebKPIsProps> = ({data, range}) => {
    const [currentTab, setCurrentTab] = useState('visits');
    const currentMetric = KPI_METRICS[currentTab];

    const chartData = useMemo(() => {
        if (!data) {
            return [];
        }

        return sanitizeChartData<KpiDataItem>(data, range, currentMetric.dataKey as keyof KpiDataItem, 'sum')?.map((item: KpiDataItem) => {
            const value = Number(item[currentMetric.dataKey]);
            return {
                date: String(item.date),
                value,
                formattedValue: currentMetric.formatter(value),
                label: currentMetric.label
            };
        });
    }, [data, range, currentMetric]);

    // Calculate KPI values
    const getKpiValues = () => {
        if (!data?.length) {
            return {visits: 0, views: 0, bounceRate: 0, duration: 0};
        }

        const totalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);
        const totalViews = data.reduce((sum, item) => sum + Number(item.pageviews), 0);

        // Ponderated KPIs calculation
        const _ponderatedKPIsTotal = (kpi: keyof typeof data[0]) => {
            return data.reduce((prev, curr) => {
                const currValue = Number(curr[kpi] ?? 0);
                const currVisits = Number(curr.visits);
                return prev + (currValue * currVisits / totalVisits);
            }, 0);
        };

        const avgBounceRate = _ponderatedKPIsTotal('bounce_rate');
        const avgDuration = _ponderatedKPIsTotal('avg_session_sec');

        return {
            visits: formatNumber(totalVisits),
            views: formatNumber(totalViews),
            bounceRate: formatPercentage(avgBounceRate),
            duration: formatDuration(avgDuration)
        };
    };

    const kpiValues = getKpiValues();

    return (
        <Tabs defaultValue="visits" variant='kpis'>
            <TabsList className="-mx-6 grid grid-cols-2">
                <KpiTabTrigger value="visits" onClick={() => setCurrentTab('visits')}>
                    <KpiTabValue color={KPI_METRICS.visits.chartColor} label="Unique visitors" value={kpiValues.visits} />
                </KpiTabTrigger>
                <KpiTabTrigger value="views" onClick={() => setCurrentTab('views')}>
                    <KpiTabValue color={KPI_METRICS.views.chartColor} label="Total views" value={kpiValues.views} />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                <GhAreaChart
                    className='-mb-3 h-[16vw] max-h-[320px] w-full'
                    color={currentMetric.chartColor}
                    data={chartData}
                    id="mrr"
                    range={range}
                    yAxisRange={[0, getYRange(chartData).max]}
                />
            </div>
        </Tabs>
    );
};

interface TopContentTableProps {
    data: TopContentData[] | null;
    range: number;
}

const TopContentTable: React.FC<TopContentTableProps> = ({data}) => {
    const navigate = useNavigate();
    return (
        <DataList>
            <DataListHeader>
                <DataListHead>Post</DataListHead>
                <DataListHead>Visitors</DataListHead>
            </DataListHeader>
            <DataListBody>

                {data?.map((row: TopContentData) => {
                    return (
                        <DataListRow key={row.pathname} className={`group/row ${row.post_id && 'hover:cursor-pointer'}`} onClick={() => {
                            if (row.post_id) {
                                navigate(`/posts/analytics/beta/${row.post_id}`, {crossApp: true});
                            }
                        }}>
                            <DataListBar className='opacity-10 transition-all group-hover/row:opacity-20' style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`,
                                backgroundColor: 'hsl(var(--chart-purple))'
                            }} />
                            <DataListItemContent className='group-hover/data:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-4 overflow-hidden'>
                                    <div className={`truncate font-medium ${row.post_id && 'group-hover/row:underline'}`}>
                                        {row.title || row.pathname}
                                    </div>
                                </div>
                                {/* {row.post_id ?
                                        <Button className='h-auto whitespace-normal p-0 text-left hover:!underline' title="View post analytics" variant='link' onClick={() => {
                                            navigate(`/posts/analytics/beta/${row.post_id}`, {crossApp: true});
                                        }}>
                                            {row.title || row.pathname}
                                        </Button>
                                        :
                                        <>
                                            {row.title || row.pathname}
                                        </>
                                    } */}
                                {/* <a className='-mx-2 inline-flex min-h-6 items-center gap-1 rounded-sm px-2 opacity-0 hover:underline group-hover/link:opacity-75' href={`${row.pathname}`} rel="noreferrer" target='_blank'>
                                        <LucideIcon.SquareArrowOutUpRight size={12} strokeWidth={2.5} />
                                    </a> */}
                            </DataListItemContent>
                            <DataListItemValue>
                                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                <DataListItemValuePerc>{formatPercentage(row.percentage || 0)}</DataListItemValuePerc>
                            </DataListItemValue>
                        </DataListRow>
                    );
                })}
            </DataListBody>
        </DataList>
    );
};

interface TopContentCardProps {
    totalVisitors: number;
    data: TopContentData[] | null;
    range: number;
}

const TopContentCard: React.FC<TopContentCardProps> = ({totalVisitors, data, range}) => {
    // Extend entire data array with percentage values
    const extendedData = data?.map(item => ({
        ...item,
        percentage: totalVisitors > 0 ? (Number(item.visits) / totalVisitors) : 0
    })) || [];

    const topContent = extendedData.slice(0, 10);

    return (
        <Card className='group/data'>
            <CardHeader>
                <CardTitle>Top content</CardTitle>
                <CardDescription>Your highest viewed posts or pages {getPeriodText(range)}</CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                <TopContentTable data={topContent} range={range} />
            </CardContent>
            <CardFooter>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                    </SheetTrigger>
                    <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                        <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
                            <SheetTitle>Top content</SheetTitle>
                            <SheetDescription>Your highest viewed posts or pages {getPeriodText(range)}</SheetDescription>
                        </SheetHeader>
                        <div className='group/data'>
                            <TopContentTable data={extendedData} range={range} />
                        </div>
                    </SheetContent>
                </Sheet>
            </CardFooter>
        </Card>
    );
};

interface SourcesTableProps {
    data: SourcesData[] | null;
    range: number;
}

const SourcesTable: React.FC<SourcesTableProps> = ({data}) => {
    return (
        <DataList>
            <DataListHeader>
                <DataListHead>Source</DataListHead>
                <DataListHead>Visitors</DataListHead>
            </DataListHeader>
            <DataListBody>
                {data?.map((row) => {
                    return (
                        <DataListRow key={row.source || 'direct'} className='group/row'>
                            <DataListBar className='opacity-15 transition-all group-hover/row:opacity-30' style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`,
                                backgroundColor: 'hsl(var(--chart-orange))'
                            }} />
                            <DataListItemContent className='group-hover/data:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-4 overflow-hidden'>
                                    <div className={`truncate font-medium`}>
                                        {row.source && typeof row.source === 'string' && isValidDomain(row.source) ?
                                            <a className='group/link flex items-center gap-2' href={`https://${row.source}`} rel="noreferrer" target="_blank">
                                                <SourceRow className='group-hover/link:underline' source={row.source} />
                                            </a>
                                            :
                                            <span className='flex items-center gap-2'>
                                                <SourceRow source={row.source} />
                                            </span>
                                        }
                                    </div>
                                </div>
                            </DataListItemContent>
                            <DataListItemValue>
                                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
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
    totalVisitors: number;
    data: SourcesData[] | null;
    range: number;
}

const SourcesCard: React.FC<SourcesCardProps> = ({totalVisitors, data, range}) => {
    // Extend entire data array with percentage values
    const extendedData = data?.map(item => ({
        ...item,
        percentage: totalVisitors > 0 ? (Number(item.visits) / totalVisitors) : 0
    })) || [];

    const topSources = extendedData.slice(0, 10);

    return (
        <Card className='group/data'>
            <CardHeader>
                <CardTitle>Top Sources</CardTitle>
                <CardDescription>How readers found your site {getPeriodText(range)}</CardDescription>
            </CardHeader>
            <CardContent>
                <Separator />
                <SourcesTable data={topSources || null} range={range} />
            </CardContent>
            <CardFooter>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                    </SheetTrigger>
                    <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                        <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
                            <SheetTitle>Top sources</SheetTitle>
                            <SheetDescription>How readers found your site {getPeriodText(range)}</SheetDescription>
                        </SheetHeader>
                        <div className='group/data'>
                            <SourcesTable data={extendedData} range={range} />
                        </div>
                    </SheetContent>
                </Sheet>
            </CardFooter>
        </Card>
    );
};

const Web: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading, range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Prepare query parameters
    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const queryParams: Record<string, string> = {
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        member_status: getAudienceQueryParam(audience)
    };

    if (timezone) {
        queryParams.timezone = timezone;
    }

    // Get KPI data
    const {data: kpiData, loading: kpiLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params
    });

    // Get top content data
    const {data: topContentData, isLoading: topContentLoading} = useTopContent({
        searchParams: queryParams
    });

    // Get top sources data
    const {data: sourcesData, loading: sourcesLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params
    });

    // Get total visitors for table
    const totalVisitors = kpiData?.length ? kpiData.reduce((sum, item) => sum + Number(item.visits), 0) : 0;

    // Calculate combined loading state
    const isLoading = isConfigLoading || kpiLoading || topContentLoading || sourcesLoading;

    return (
        <StatsLayout>
            <StatsHeader>
                <AudienceSelect />
                <DateRangeSelect />
            </StatsHeader>
            <StatsView isLoading={isLoading}>
                <Card>
                    <CardContent>
                        <WebKPIs data={kpiData as KpiDataItem[] | null} range={range} />
                    </CardContent>
                </Card>
                <div className='grid grid-cols-2 gap-8'>
                    <TopContentCard data={topContentData?.stats || null} range={range} totalVisitors={totalVisitors} />
                    <SourcesCard data={sourcesData as SourcesData[] | null} range={range} totalVisitors={totalVisitors} />
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
