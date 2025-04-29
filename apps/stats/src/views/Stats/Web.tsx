import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useState} from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, H1, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsList, ViewHeader, ViewHeaderActions, formatDisplayDate, formatDuration, formatNumber, formatPercentage, formatQueryDate} from '@tryghost/shade';
import {KpiTabTrigger, KpiTabValue} from './components/KpiTab';
import {calculateYAxisWidth, getPeriodText, getRangeDates, getYTicks} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

type KpiMetric = {
    dataKey: string;
    label: string;
    formatter: (value: number) => string;
};

const KPI_METRICS: Record<string, KpiMetric> = {
    visits: {
        dataKey: 'visits',
        label: 'Visitors',
        formatter: formatNumber
    },
    views: {
        dataKey: 'pageviews',
        label: 'Pageviews',
        formatter: formatNumber
    },
    'bounce-rate': {
        dataKey: 'bounce_rate',
        label: 'Bounce rate',
        formatter: formatPercentage
    },
    'visit-duration': {
        dataKey: 'avg_session_sec',
        label: 'Visit duration',
        formatter: formatDuration
    }
};

const WebKPIs:React.FC = ({}) => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();
    const [currentTab, setCurrentTab] = useState('visits');
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const params = {
        site_uuid: statsConfig?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_kpis'),
        token: getToken(statsConfig),
        params
    });

    const isLoading = isConfigLoading || loading;

    const currentMetric = KPI_METRICS[currentTab];

    const chartData = data?.map((item) => {
        const value = Number(item[currentMetric.dataKey]);
        return {
            date: item.date,
            value,
            formattedValue: currentMetric.formatter(value),
            label: currentMetric.label
        };
    });

    // Calculate KPI values
    const getKpiValues = () => {
        if (!data?.length) {
            return {visits: 0, views: 0, bounceRate: 0, duration: 0};
        }

        // Sum total KPI value from the trend, ponderating using sessions
        const _ponderatedKPIsTotal = (kpi: keyof typeof data[0]) => {
            return data.reduce((prev, curr) => {
                const currValue = Number(curr[kpi] ?? 0);
                const currVisits = Number(curr.visits);
                return prev + (currValue * currVisits / totalVisits);
            }, 0);
        };

        const totalVisits = data.reduce((sum, item) => sum + Number(item.visits), 0);
        const totalViews = data.reduce((sum, item) => sum + Number(item.pageviews), 0);
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

    const chartConfig = {
        value: {
            label: currentMetric.label
        }
    } satisfies ChartConfig;

    return (
        <Tabs defaultValue="visits" variant='underline'>
            <TabsList className="grid grid-cols-4 gap-5">
                <KpiTabTrigger value="visits" onClick={() => {
                    setCurrentTab('visits');
                }}>
                    <KpiTabValue label="Unique visitors" value={kpiValues.visits} />
                </KpiTabTrigger>
                <KpiTabTrigger value="views" onClick={() => {
                    setCurrentTab('views');
                }}>
                    <KpiTabValue label="Total views" value={kpiValues.views} />
                </KpiTabTrigger>
            </TabsList>
            <div className='my-4 [&_.recharts-cartesian-axis-tick-value]:fill-gray-500'>
                {isLoading ? 'Loading' :
                    <ChartContainer className='-mb-3 h-[16vw] max-h-[320px] w-full' config={chartConfig}>
                        <Recharts.LineChart
                            data={chartData}
                            margin={{
                                left: 0,
                                right: 20,
                                top: 12
                            }}
                            accessibilityLayer
                        >
                            <Recharts.CartesianGrid horizontal={false} vertical={false} />
                            <Recharts.XAxis
                                axisLine={false}
                                dataKey="date"
                                interval={0}
                                tickFormatter={formatDisplayDate}
                                tickLine={false}
                                tickMargin={8}
                                ticks={chartData && chartData.length > 0 ? [chartData[0].date, chartData[chartData.length - 1].date] : []}
                            />
                            <Recharts.YAxis
                                axisLine={false}
                                tickFormatter={(value) => {
                                    switch (currentTab) {
                                    case 'bounce-rate':
                                        return formatPercentage(value);
                                    case 'visit-duration':
                                        return formatDuration(value);
                                    case 'visits':
                                    case 'views':
                                        return formatNumber(value);
                                    default:
                                        return value.toLocaleString();
                                    }
                                }}
                                tickLine={false}
                                ticks={getYTicks(chartData || [])}
                                width={calculateYAxisWidth(getYTicks(chartData || []), currentMetric.formatter)}
                            />
                            <ChartTooltip
                                content={<CustomTooltipContent />}
                                cursor={true}
                            />
                            <Recharts.Line
                                dataKey="value"
                                dot={false}
                                isAnimationActive={false}
                                stroke="hsl(var(--chart-1))"
                                strokeWidth={2}
                                type='bump'
                            />
                        </Recharts.LineChart>
                    </ChartContainer>
                }
            </div>
        </Tabs>
    );
};

const Web:React.FC = () => {
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

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_pages'),
        token: getToken(statsConfig),
        params
    });

    const isLoading = isConfigLoading || loading;

    return (
        <StatsLayout>
            <ViewHeader>
                <H1>Web</H1>
                <ViewHeaderActions>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={data} isLoading={isLoading}>
                <Card variant='plain'>
                    <CardContent>
                        <WebKPIs />
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>Top content</CardTitle>
                        <CardDescription>Your highest viewed posts or pages {getPeriodText(range)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[80%]'>Content</TableHead>
                                    <TableHead className='w-[20%] text-right'>Visitors</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.map((row) => {
                                    return (
                                        <TableRow key={row.pathname}>
                                            <TableCell className="font-medium"><a className='-mx-2 inline-block px-2 hover:underline' href={`${row.pathname}`} rel="noreferrer" target='_blank'>{row.pathname}</a></TableCell>
                                            <TableCell className='text-right font-mono text-sm'>{formatNumber(Number(row.visits))}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

export default Web;
