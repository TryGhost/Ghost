import React from 'react';
import {STATS_DEFAULT_SOURCE_ICON_URL} from '@src/utils/constants';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow, formatNumber, formatQueryDate} from '@tryghost/shade';
import {getAudienceQueryParam} from '../AudienceSelect';
import {getRangeDates} from '@src/utils/chart-helpers';
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

    return (
        <>
            {isLoading ? 'Loading' :
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
            }
        </>
    );
};

export default Sources;
