import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, Recharts, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';
import {Header, HeaderActions} from '@src/components/layout/Header';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {formatNumber, formatQueryDate} from '@src/utils/data-formatters';
import {getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl} from '@src/config/stats-config';
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
    const {data: configData, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);

    const params = {
        site_uuid: configData?.config.stats?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(configData?.config.stats?.endpoint, 'api_top_sources'),
        token: configData?.config.stats?.token || '',
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
            <Header>
                Sources
                <HeaderActions>
                    <AudienceSelect />
                    <DateRangeSelect />
                </HeaderActions>
            </Header>
            <StatsView data={data} isLoading={isLoading}>
                <Card className='-mb-5' variant='plain'>
                    <CardHeader className='border-none'>
                        <CardTitle>Top sources</CardTitle>
                        <CardDescription>How readers are finding your site</CardDescription>
                    </CardHeader>
                    <CardContent className='border-none text-gray-500'>
                        <ChartContainer
                            className="mx-auto aspect-square max-h-[300px]"
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
                                    nameKey="source"
                                    stroke="hsl(var(--background))"
                                    strokeWidth={3}
                                />
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
                                        <TableHead className='w-[20%]'>Visitors</TableHead>
                                        <TableHead className='w-5'></TableHead>
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
                                                <TableCell>{formatNumber(Number(row.visits))}</TableCell>
                                                <TableCell>{key < 5 && <span className='inline-block size-[10px] rounded-[2px]' style={{backgroundColor: colors[key]}}></span>}</TableCell>
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
