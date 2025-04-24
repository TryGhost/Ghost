import React from 'react';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber} from '@tryghost/shade';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
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

interface SourcesProps {
    queryParams: Record<string, string | number>
}

const Sources:React.FC<SourcesProps> = ({queryParams}) => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_sources'),
        token: getToken(statsConfig),
        params: queryParams
    });

    const isLoading = isConfigLoading || loading;

    return (
        <>
            {isLoading ? '' :
                <>
                    {data!.length > 0 &&
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Sources</CardTitle>
                                <CardDescription>How readers found your post</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className='w-[80%]'>Source</TableHead>
                                            <TableHead className='text-right'>Visitors</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.map((row) => {
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

export default Sources;
