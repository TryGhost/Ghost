import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, H1, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, ViewHeaderActions, formatNumber, formatQueryDate} from '@tryghost/shade';
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
                className="gh-stats-favicon"
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

    const chartData = React.useMemo(() => {
        if (!data) {
            return [];
        }

        // Sort by visits and take top 5
        const topSources = [...data]
            .sort((a, b) => Number(b.visits) - Number(a.visits))
            .slice(0, 5);

        // Transform into chart data format
        return topSources.map((source, index) => ({
            source: String(source.source || 'Direct'),
            visitors: Number(source.visits),
            fill: colors[index]
        }));
    }, [data, colors]);

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
            <ViewHeader>
                <H1>Sources</H1>
                <ViewHeaderActions>
                    <AudienceSelect />
                    <DateRangeSelect />
                </ViewHeaderActions>
            </ViewHeader>
            <StatsView data={data} isLoading={isLoading}>
                <Card className='-mb-5' variant='plain'>
                    <CardHeader className='border-none'>
                        <CardTitle>Top sources</CardTitle>
                        <CardDescription>How readers found your site {getPeriodText(range)}</CardDescription>
                    </CardHeader>
                    <CardContent className='border-none text-gray-500 [&_.recharts-pie-label-line]:stroke-gray-300'>
                        <ChartContainer
                            className="mx-auto h-[16vw] max-h-[320px] w-full"
                            config={chartConfig}
                        >
                            <Recharts.PieChart>
                                <ChartTooltip
                                    content={<ChartTooltipContent hideLabel />}
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
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardContent>
                        {isLoading ? 'Loading' :
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
                                                    {row.source ?
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
                                                <TableCell className='text-right'>{key < 5 && <span className='inline-block size-[10px] rounded-[2px]' style={{backgroundColor: colors[key]}}></span>}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        }
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

export default Sources;
