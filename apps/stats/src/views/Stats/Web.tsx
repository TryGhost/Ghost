import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useMemo, useState} from 'react';
import StatsHeader from './layout/StatsHeader';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, GhAreaChart, KpiTabTrigger, KpiTabValue, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, Tabs, TabsList, formatDuration, formatNumber, formatPercentage, formatQueryDate, getRangeDates, getYRange} from '@tryghost/shade';
import {KpiMetric} from '@src/types/kpi';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {SourcesCard, getStatEndpointUrl, getToken, useNavigate} from '@tryghost/admin-x-framework';
import {getPeriodText, sanitizeChartData} from '@src/utils/chart-helpers';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';
import {useTopContent} from '@tryghost/admin-x-framework/api/stats';

// Define types for our page data

// Unified data structure for content
interface UnifiedContentData {
    pathname: string;
    title: string;
    visits: number;
    percentage?: number;
    post_uuid?: string;
    post_id?: string;
}

interface KpiDataItem {
    date: string;
    [key: string]: string | number;
}

interface SourcesData {
    source?: string | number;
    visits?: number;
    [key: string]: unknown;
    percentage?: number;
}

// Content type definitions
const CONTENT_TYPES = {
    POSTS: 'posts',
    PAGES: 'pages',
    POSTS_AND_PAGES: 'posts-and-pages'
} as const;

type ContentType = typeof CONTENT_TYPES[keyof typeof CONTENT_TYPES];

const CONTENT_TYPE_OPTIONS = [
    {value: CONTENT_TYPES.POSTS, label: 'Posts'},
    {value: CONTENT_TYPES.PAGES, label: 'Pages'},
    {value: CONTENT_TYPES.POSTS_AND_PAGES, label: 'Posts & pages'}
];

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
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        chartColor: 'hsl(var(--chart-teal))',
        formatter: formatPercentage
    },
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        chartColor: 'hsl(var(--chart-teal))',
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
                    <KpiTabValue color='hsl(var(--chart-blue))' label="Unique visitors" value={kpiValues.visits} />
                </KpiTabTrigger>
                <KpiTabTrigger value="views" onClick={() => setCurrentTab('views')}>
                    <KpiTabValue color='hsl(var(--chart-teal))' label="Total views" value={kpiValues.views} />
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
    data: UnifiedContentData[] | null;
    range: number;
    contentType: ContentType;
}

const TopContentTable: React.FC<TopContentTableProps> = ({data, contentType}) => {
    const navigate = useNavigate();
    
    const getTableHeader = () => {
        switch (contentType) {
        case CONTENT_TYPES.POSTS:
            return 'Post';
        case CONTENT_TYPES.PAGES:
            return 'Page';
        default:
            return 'Post';
        }
    };

    return (
        <DataList>
            <DataListHeader>
                <DataListHead>{getTableHeader()}</DataListHead>
                <DataListHead>Visitors</DataListHead>
            </DataListHeader>
            <DataListBody>
                {data?.map((row: UnifiedContentData) => {
                    const isClickable = row.post_id;
                    const handleClick = () => {
                        if (row.post_id) {
                            navigate(`/posts/analytics/beta/${row.post_id}`, {crossApp: true});
                        }
                    };

                    return (
                        <DataListRow 
                            key={row.pathname} 
                            className={`group/row ${isClickable && 'hover:cursor-pointer'}`} 
                            onClick={handleClick}
                        >
                            <DataListBar className='bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 opacity-20 transition-all group-hover/row:opacity-40' style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                            }} />
                            <DataListItemContent className='group-hover/datalist:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-4 overflow-hidden'>
                                    <div className={`truncate font-medium ${isClickable && 'group-hover/row:underline'}`}>
                                        {row.title}
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

interface TopContentCardProps {
    range: number;
}

const TopContentCard: React.FC<TopContentCardProps> = ({range}) => {
    const {audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const [selectedContentType, setSelectedContentType] = useState<ContentType>(CONTENT_TYPES.POSTS);

    // Prepare query parameters based on selected content type
    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            date_from: formatQueryDate(startDate),
            date_to: formatQueryDate(endDate),
            member_status: getAudienceQueryParam(audience)
        };

        if (timezone) {
            params.timezone = timezone;
        }

        // Add post_type filter based on selected content type
        if (selectedContentType === CONTENT_TYPES.POSTS) {
            params.post_type = 'post';
        } else if (selectedContentType === CONTENT_TYPES.PAGES) {
            params.post_type = 'page';
        }
        // For POSTS_AND_PAGES, don't add post_type filter to get both

        return params;
    }, [startDate, endDate, timezone, audience, selectedContentType]);

    // Get filtered content data
    const {data: topContentData, isLoading: topContentLoading} = useTopContent({
        searchParams: queryParams
    });

    // Transform data for display
    const transformedData = useMemo((): UnifiedContentData[] | null => {
        const data = topContentData?.stats || null;
        if (!data) {
            return null;
        }
        
        // Calculate total visits for the filtered dataset
        const filteredTotalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);
        
        return data.map(item => ({
            pathname: item.pathname,
            title: item.title || item.pathname,
            visits: item.visits,
            percentage: filteredTotalVisits > 0 ? (Number(item.visits) / filteredTotalVisits) : 0,
            post_uuid: item.post_uuid,
            post_id: item.post_id
        }));
    }, [topContentData]);

    const topContent = transformedData?.slice(0, 10) || [];

    const getContentTypeLabel = () => {
        const option = CONTENT_TYPE_OPTIONS.find(opt => opt.value === selectedContentType);
        return option ? option.label : 'Posts & pages';
    };

    const getContentTitle = () => {
        switch (selectedContentType) {
        case CONTENT_TYPES.POSTS:
            return 'Top performing posts';
        case CONTENT_TYPES.PAGES:
            return 'Top performing pages';
        default:
            return 'Top performing posts';
        }
    };

    if (topContentLoading) {
        return (
            <Card className='group/datalist'>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{getContentTitle()}</CardTitle>
                            <CardDescription>Loading...</CardDescription>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    const getContentDescription = () => {
        switch (selectedContentType) {
        case CONTENT_TYPES.POSTS:
            return `Your highest viewed posts ${getPeriodText(range)}`;
        case CONTENT_TYPES.PAGES:
            return `Your highest viewed pages ${getPeriodText(range)}`;
        default:
            return `Your highest viewed posts or pages ${getPeriodText(range)}`;
        }
    };

    return (
        <Card className='group/datalist'>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{getContentTitle()}</CardTitle>
                        <CardDescription>{getContentDescription()}</CardDescription>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="gap-1 text-sm" size="sm" variant="outline">
                                {getContentTypeLabel()}
                                <LucideIcon.ChevronDown className="size-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {CONTENT_TYPE_OPTIONS.map(option => (
                                <DropdownMenuItem 
                                    key={option.value}
                                    onClick={() => setSelectedContentType(option.value)}
                                >
                                    {option.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent>
                <Separator />
                <TopContentTable 
                    contentType={selectedContentType}
                    data={topContent} 
                    range={range} 
                />
            </CardContent>
            {transformedData && transformedData.length > 10 &&
                <CardFooter>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                        </SheetTrigger>
                        <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                            <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
                                <SheetTitle>Top content</SheetTitle>
                                <SheetDescription>{getContentDescription()}</SheetDescription>
                            </SheetHeader>
                            <div className='group/datalist'>
                                <TopContentTable 
                                    contentType={selectedContentType}
                                    data={transformedData} 
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

const Web: React.FC = () => {
    const {statsConfig, isLoading: isConfigLoading, range, audience, data} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    // Get site URL and icon for domain comparison and Direct traffic favicon
    const siteUrl = data?.url as string | undefined;
    const siteIcon = data?.icon as string | undefined;

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

    // Get top sources data
    const {data: sourcesData, loading: sourcesLoading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params
    });

    // Get total visitors for table
    const totalVisitors = kpiData?.length ? kpiData.reduce((sum, item) => sum + Number(item.visits), 0) : 0;

    // Calculate combined loading state  
    const isLoading = isConfigLoading || kpiLoading || sourcesLoading;

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
                    <TopContentCard 
                        range={range} 
                    />
                    <SourcesCard 
                        data={sourcesData as SourcesData[] | null} 
                        defaultSourceIconUrl={STATS_DEFAULT_SOURCE_ICON_URL}
                        getPeriodText={getPeriodText}
                        range={range} 
                        siteIcon={siteIcon} 
                        siteUrl={siteUrl} 
                        totalVisitors={totalVisitors} 
                    />
                </div>
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
