import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import WebKpis from './components/WebKpis';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';
import {Header, HeaderActions} from '@src/components/layout/Header';
import {formatNumber, formatQueryDate} from '@src/utils/data-formatters';
import {getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

const Web:React.FC = () => {
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
        endpoint: getStatEndpointUrl(configData?.config.stats?.endpoint, 'api_top_pages'),
        token: configData?.config.stats?.token || '',
        params
    });

    const isLoading = isConfigLoading || loading;

    return (
        <StatsLayout>
            <Header>
                Web
                <HeaderActions>
                    <AudienceSelect />
                    <DateRangeSelect />
                </HeaderActions>
            </Header>
            <StatsView data={data} isLoading={isLoading}>
                <Card variant='plain'>
                    <CardContent>
                        <WebKpis />
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>Top content on your website</CardTitle>
                        <CardDescription>Your highest viewed posts in this period</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[80%]'>Content</TableHead>
                                    <TableHead className='w-[20%]'>Visitors</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.map((row) => {
                                    return (
                                        <TableRow key={row.pathname}>
                                            <TableCell className="font-medium">{row.pathname}</TableCell>
                                            <TableCell>{formatNumber(Number(row.visits))}</TableCell>
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
