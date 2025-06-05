import React, {useMemo} from 'react';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, Flag, formatNumber, formatPercentage} from '@tryghost/shade';
import {STATS_LABEL_MAPPINGS} from '@src/utils/constants';
import {getStatEndpointUrl, getToken} from '@tryghost/admin-x-framework';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';
import {useQuery} from '@tinybirdco/charts';

countries.registerLocale(enLocale);
const getCountryName = (label: string) => {
    return STATS_LABEL_MAPPINGS[label as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(label, 'en') || 'Unknown';
};

interface LocationsProps {
    queryParams: Record<string, string | number>
}

// Array of values that represent unknown locations
const UNKNOWN_LOCATIONS = ['NULL', 'ᴺᵁᴸᴸ', ''];

// Normalize country code for flag display
const normalizeCountryCode = (code: string): string => {
    // Common mappings for countries that might come through with full names
    const mappings: Record<string, string> = {
        'UNITED STATES': 'US',
        'UNITED STATES OF AMERICA': 'US',
        USA: 'US',
        'UNITED KINGDOM': 'GB',
        UK: 'GB',
        'GREAT BRITAIN': 'GB',
        NETHERLANDS: 'NL'
    };

    const upperCode = code.toUpperCase();
    return mappings[upperCode] || (code.length > 2 ? code.substring(0, 2) : code);
};

interface ProcessedLocationData {
    location: string;
    visits: number;
    percentage: number;
}

const Locations:React.FC<LocationsProps> = ({queryParams}) => {
    const {statsConfig, isLoading: isConfigLoading} = useGlobalData();

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(statsConfig, 'api_top_locations'),
        token: getToken(statsConfig),
        params: queryParams
    });

    const isLoading = isConfigLoading || loading;

    // Calculate total visits for percentage calculation
    const totalVisits = useMemo(() => data?.reduce((sum, row) => sum + Number(row.visits), 0) || 0,
        [data]
    );

    // Memoize the processed data with percentages
    const processedData = useMemo<ProcessedLocationData[]>(() => {
        const processed = data?.map(row => ({
            location: String(row.location),
            visits: Number(row.visits),
            percentage: totalVisits > 0 ? (Number(row.visits) / totalVisits) : 0,
            isUnknown: UNKNOWN_LOCATIONS.includes(String(row.location))
        })) || [];

        // Sort the data to put unknown locations at the end
        return processed.sort((a, b) => {
            if (a.isUnknown && !b.isUnknown) {
                return 1;
            }
            if (!a.isUnknown && b.isUnknown) {
                return -1;
            }
            return 0;
        }).map(({isUnknown, ...rest}) => ({
            ...rest,
            location: isUnknown ? 'Unknown' : rest.location
        }));
    }, [data, totalVisits]);

    return (
        <>
            {isLoading ? '' :
                <>
                    {(data && data.length > 0) &&
                <Card className='group/datalist'>
                    <CardHeader>
                        <CardTitle>Locations</CardTitle>
                        <CardDescription>Where are the readers of this post</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataList>
                            <DataListHeader className='py-4'>
                                <DataListHead>Source</DataListHead>
                                <DataListHead>Visitors</DataListHead>
                            </DataListHeader>
                            <DataListBody>
                                {processedData.map((row) => {
                                    const countryName = getCountryName(`${row.location}`) || 'Unknown';
                                    return (
                                        <DataListRow key={row.location || 'unknown'}>
                                            <DataListBar className='opacity-10 transition-all group-hover/row:opacity-20' style={{
                                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`,
                                                backgroundColor: 'hsl(var(--chart-purple))'
                                            }} />
                                            <DataListItemContent className='group-hover/data:max-w-[calc(100%-140px)]'>
                                                <div className='flex items-center space-x-3 overflow-hidden' title={countryName || 'Unknown'}>
                                                    <Flag
                                                        countryCode={`${normalizeCountryCode(row.location as string)}`}
                                                        fallback={
                                                            <span className='flex h-[14px] w-[22px] items-center justify-center rounded-[2px] bg-black text-white'>
                                                                {/* <SkullAndBones className="size-3" /> */}
                                                            </span>
                                                        }
                                                    />
                                                    <div className='truncate font-medium'>{countryName}</div>
                                                </div>
                                            </DataListItemContent>
                                            <DataListItemValue>
                                                <DataListItemValueAbs>{formatNumber(Number(row.visits))}</DataListItemValueAbs>
                                                <DataListItemValuePerc>{formatPercentage(row.percentage)}</DataListItemValuePerc>
                                            </DataListItemValue>
                                        </DataListRow>
                                    );
                                })}
                            </DataListBody>
                        </DataList>
                    </CardContent>
                </Card>
                    }
                </>
            }
        </>
    );
};

export default Locations;
