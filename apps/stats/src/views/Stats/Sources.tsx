import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, H1, Recharts, Separator, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, ViewHeaderActions, formatNumber, formatPercentage, formatQueryDate, isValidDomain} from '@tryghost/shade';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {getPeriodText, getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

interface SourceRowProps {
    className?: string;
    source?: string | number;
}

const SourceRow: React.FC<SourceRowProps> = ({className, source}) => {
    return (
        <>
            <img
                className="size-4"
                src={`https://www.faviconextractor.com/favicon/${source || 'direct'}?larger=true`}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    e.currentTarget.src = STATS_DEFAULT_SOURCE_ICON_URL;
                }} />
            <span className={className}>{source || 'Direct'}</span>
        </>
    );
};

const Sources:React.FC = () => {
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
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params
    });

    const isLoading = isConfigLoading || loading;

    const colors = React.useMemo(() => [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))'
    ], []);

    // Calculate total visits across all sources
    const totalVisits = React.useMemo(() => {
        if (!data) {
            return 0;
        }
        return data.reduce((sum, source) => sum + Number(source.visits), 0);
    }, [data]);

    const chartData = React.useMemo(() => {
        if (!data) {
            return [];
        }

        // Sort by visits
        const sortedSources = [...data].sort((a, b) => Number(b.visits) - Number(a.visits));

        // Get top 4 sources
        const topSources = sortedSources.slice(0, 4);

        // Calculate sum of remaining sources
        const otherSourcesSum = sortedSources
            .slice(4)
            .reduce((sum, source) => sum + Number(source.visits), 0);

        // Transform into chart data format
        const chartDataItems = topSources.map((source, index) => ({
            source: String(source.source || 'Direct'),
            visitors: Number(source.visits),
            percentage: (Number(source.visits) / totalVisits),
            fill: colors[index]
        }));

        // Add "Others" category if there are remaining sources
        if (otherSourcesSum > 0) {
            chartDataItems.push({
                source: 'Others',
                visitors: otherSourcesSum,
                percentage: (otherSourcesSum / totalVisits),
                fill: colors[4]
            });
        }

        return chartDataItems;
    }, [data, colors, totalVisits]);

    const chartConfig = {
        visitors: {
            label: 'Visitors'
        },
        ...chartData.reduce((acc, source, index) => ({
            ...acc,
            [source.source.toLowerCase()]: {
                label: source.source,
                color: colors[index]
            }
        }), {})
    } satisfies ChartConfig;

    return (
        <StatsLayout>
            <ViewHeader className='before:hidden'>
                <H1>Sources</H1>
                <ViewHeaderActions>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={data} isLoading={isLoading}>
                <Card className='-mb-5'>
                    <CardHeader className='border-none'>
                        <CardTitle>Top Sources</CardTitle>
                        <CardDescription>How readers found your site {getPeriodText(range)}</CardDescription>
                    </CardHeader>
                    <CardContent className='border-none [&_.recharts-pie-label-line]:stroke-gray-300'>
                        <ChartContainer
                            className="mx-auto h-[16vw] max-h-[320px] w-full text-gray-500"
                            config={chartConfig}
                        >
                            <Recharts.PieChart>
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name, item) => (
                                                <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                                                    <div
                                                        className="size-2.5 shrink-0 rounded-[2px]"
                                                        style={{backgroundColor: item.payload.fill}}
                                                    />
                                                    {chartConfig[name as keyof typeof chartConfig]?.label || name}
                                                    <div className="ml-2 flex items-center gap-0.5 font-mono font-medium tabular-nums text-muted-foreground">
                                                        <span className='text-foreground'>{formatNumber(Number(value))}</span>
                                                        <span>
                                                            ({formatPercentage(item.payload.percentage)})
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            hideLabel
                                        />
                                    }
                                    cursor={false}
                                />
                                <Recharts.Pie
                                    data={chartData}
                                    dataKey="visitors"
                                    innerRadius={'55%'}
                                    isAnimationActive={false}
                                    label={({name, ...props}) => {
                                        return (
                                            <text
                                                className='fill-gray-700 text-sm'
                                                cx={props.cx}
                                                cy={props.cy}
                                                dominantBaseline={props.dominantBaseline}
                                                textAnchor={props.textAnchor}
                                                x={props.x + (props.textAnchor === 'end' ? -6 : 6)}
                                                y={props.y + 3}
                                            >
                                                <tspan>{name}</tspan>
                                            </text>
                                        );
                                    }}
                                    nameKey="source"
                                    stroke="hsl(var(--background))"
                                    strokeWidth={1} />
                            </Recharts.PieChart>
                        </ChartContainer>
                        {isLoading ? 'Loading' :
                            <>
                                <Separator className='mt-10' />
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className='w-[80%]'>Source</TableHead>
                                            <TableHead className='text-right'>Visitors</TableHead>
                                            <TableHead className='w-5 text-right'></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.map((row, key) => {
                                            return (
                                                <TableRow key={row.source || 'direct'}>
                                                    <TableCell className="font-medium">
                                                        {row.source && typeof row.source === 'string' && isValidDomain(row.source) ?
                                                            <a className='group flex items-center gap-1' href={`https://${row.source}`} rel="noreferrer" target="_blank">
                                                                <SourceRow className='group-hover:underline' source={row.source} />
                                                            </a>
                                                            :
                                                            <span className='flex items-center gap-1'>
                                                                <SourceRow source={row.source} />
                                                            </span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className='text-right font-mono text-sm'>{formatNumber(Number(row.visits))}</TableCell>
                                                    <TableCell className='text-right'>{key < 4 && <span className='inline-block size-[10px] rounded-[2px]' style={{backgroundColor: colors[key]}}></span>}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </>
                        }
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

export default Sources;
