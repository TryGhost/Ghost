import React from 'react';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber} from '@tryghost/shade';
import {STATS_LABEL_MAPPINGS} from '@src/utils/constants';
import {getCountryFlag} from '@src/utils/chart-helpers';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

countries.registerLocale(enLocale);
const getCountryName = (label: string) => {
    return STATS_LABEL_MAPPINGS[label as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(label, 'en') || 'Unknown';
};

interface LocationsProps {
    queryParams: Record<string, string | number>
}

const Locations:React.FC<LocationsProps> = ({queryParams}) => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_locations'),
        token: getToken(statsConfig),
        params: queryParams
    });

    const isLoading = isConfigLoading || loading;

    return (
        <>
            {isLoading ? '' :
                <>
                    {(data && data.length > 0) &&
                <Card>
                    <CardHeader>
                        <CardTitle>Locations</CardTitle>
                        <CardDescription>Where are the readers of this post</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[80%]'>Country</TableHead>
                                    <TableHead className='w-[20%] text-right'>Visitors</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.map((row) => {
                                    const countryName = getCountryName(`${row.location}`) || 'Unknown';
                                    return (
                                        <TableRow key={row.location || 'unknown'}>
                                            <TableCell className="font-medium">
                                                <span title={countryName || 'Unknown'}>{getCountryFlag(`${row.location}`)} {countryName}</span>
                                            </TableCell>
                                            <TableCell className='text-right font-mono text-sm'>{formatNumber(Number(row.visits))}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                    }
                </>
            }
        </>
    );
};

export default Locations;
