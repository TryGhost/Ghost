import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import WebKpis from './components/WebKpis';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, H1, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, ViewHeader, ViewHeaderActions, formatNumber, formatQueryDate} from '@tryghost/shade';
import {getPeriodText, getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

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
                        <WebKpis />
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
