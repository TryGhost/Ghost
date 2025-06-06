import React, {useMemo} from 'react';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, Flag, Icon, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, formatNumber, formatPercentage} from '@tryghost/shade';
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

interface LocationsTableProps {
    data: ProcessedLocationData[];
}

const LocationsTable: React.FC<LocationsTableProps> = ({data}) => {
    return (
        <DataList>
            <DataListHeader>
                <DataListHead>Country</DataListHead>
                <DataListHead>Visitors</DataListHead>
            </DataListHeader>
            <DataListBody>
                {data.map((row) => {
                    const countryName = getCountryName(`${row.location}`) || 'Unknown';
                    return (
                        <DataListRow key={row.location || 'unknown'}>
                            <DataListBar className='bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 opacity-20 transition-all' style={{
                                width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                            }} />
                            <DataListItemContent className='group-hover/data:max-w-[calc(100%-140px)]'>
                                <div className='flex items-center space-x-3 overflow-hidden' title={countryName || 'Unknown'}>
                                    <Flag
                                        countryCode={`${normalizeCountryCode(row.location as string)}`}
                                        fallback={
                                            <span className='flex h-[14px] w-[22px] items-center justify-center rounded-[2px] bg-black text-white'>
                                                <Icon.SkullAndBones className='size-3' />
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
    );
};

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

        // Separate known and unknown locations
        const knownLocations = processed.filter(item => !item.isUnknown);
        const unknownLocations = processed.filter(item => item.isUnknown);

        // Combine unknown locations into a single entry
        const combinedUnknown = unknownLocations.length > 0 ? [{
            location: 'Unknown',
            visits: unknownLocations.reduce((sum, item) => sum + item.visits, 0),
            percentage: unknownLocations.reduce((sum, item) => sum + item.percentage, 0)
        }] : [];

        // Return combined array with known locations first, followed by the combined unknown entry
        return [...knownLocations, ...combinedUnknown];
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
                        <Separator />
                        <LocationsTable data={processedData} />
                    </CardContent>
                    {processedData!.length > 10 &&
                        <CardFooter>
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                                </SheetTrigger>
                                <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                                    <SheetHeader className='sticky top-0 z-40 -mx-6 bg-white/60 p-6 backdrop-blur'>
                                        <SheetTitle>Top locations</SheetTitle>
                                        <SheetDescription>Where are the readers of this post</SheetDescription>
                                    </SheetHeader>
                                    <div className='group/datalist'>
                                        <LocationsTable data={processedData} />
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </CardFooter>
                    }
                </Card>
                    }
                </>
            }
        </>
    );
};

export default Locations;
