import DateRangeSelect from './components/DateRangeSelect';
import Header from '@src/components/layout/Header';
import React from 'react';
import StatsLayout from './layout/StatsLayout';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';
import {formatNumber, formatQueryDate} from '@src/utils/data-formatters';
import {getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

const Locations:React.FC = () => {
    const {data: configData, isLoading: isConfigLoading} = useGlobalData();
    const {range} = useGlobalData();
    const {today, startDate} = getRangeDates(range);

    const params = {
        site_uuid: configData?.config.stats?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(today)
    };

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(configData?.config.stats?.endpoint, 'api_top_locations'),
        token: configData?.config.stats?.token || '',
        params
    });

    const isLoading = isConfigLoading || loading;

    return (
        <StatsLayout>
            <Header>
                Locations
                <DateRangeSelect />
            </Header>
            <section className='grid grid-cols-1 gap-8'>
                <Card variant='plain'>
                    <CardContent className='border-none py-20 text-center text-gray-500'>
                        Map
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>Locations</CardTitle>
                        <CardDescription>A breakdown of where your audience is located</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? 'Loading' :
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='w-[80%]'>Country</TableHead>
                                        <TableHead className='w-[20%]'>Visitors</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data?.map((row) => {
                                        return (
                                            <TableRow key={row.location || 'unknown'}>
                                                <TableCell className="font-medium">{row.location || 'Unknown'}</TableCell>
                                                <TableCell>{formatNumber(Number(row.visits))}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        }
                    </CardContent>
                </Card>
            </section>
        </StatsLayout>
    );
};

export default Locations;
