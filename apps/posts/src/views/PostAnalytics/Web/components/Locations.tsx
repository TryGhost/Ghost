import React from 'react';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, Flag, HTable, Icon, LucideIcon, Separator, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, formatNumber, formatPercentage} from '@tryghost/shade';
import {STATS_LABEL_MAPPINGS} from '@src/utils/constants';

countries.registerLocale(enLocale);
const getCountryName = (label: string) => {
    return STATS_LABEL_MAPPINGS[label as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(label, 'en') || 'Unknown';
};

interface ProcessedLocationData {
    location: string;
    visits: number;
    percentage: number;
}

interface LocationsProps {
    data: ProcessedLocationData[];
    isLoading: boolean;
}

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

interface LocationsTableProps {
    data: ProcessedLocationData[];
    tableHeader: boolean;
}

const LocationsTable: React.FC<LocationsTableProps> = ({tableHeader, data}) => {
    return (
        <DataList>
            {tableHeader &&
                <DataListHeader>
                    <DataListHead>Country</DataListHead>
                    <DataListHead>Visitors</DataListHead>
                </DataListHeader>
            }
            <DataListBody>
                {data.map((row) => {
                    const countryName = getCountryName(`${row.location}`) || 'Unknown';
                    return (
                        <DataListRow key={row.location || 'unknown'}>
                            <DataListBar style={{
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

const Locations:React.FC<LocationsProps> = ({data, isLoading}) => {
    const topLocations = data.slice(0, 10);

    return (
        <>
            {isLoading ? '' :
                <>
                    {(data && data.length > 0) &&
                <Card className='group/datalist'>
                    <div className='flex items-center justify-between p-6'>
                        <CardHeader className='p-0'>
                            <CardTitle>Locations</CardTitle>
                            <CardDescription>Where are the readers of this post</CardDescription>
                        </CardHeader>
                        <HTable className='mr-2'>Visitors</HTable>
                    </div>
                    <CardContent className='overflow-hidden'>
                        <Separator />
                        <LocationsTable
                            data={topLocations}
                            tableHeader={false}
                        />
                    </CardContent>
                    {data.length > 10 &&
                        <CardFooter>
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant='outline'>View all <LucideIcon.TableOfContents /></Button>
                                </SheetTrigger>
                                <SheetContent className='overflow-y-auto pt-0 sm:max-w-[600px]'>
                                    <SheetHeader className='sticky top-0 z-40 -mx-6 bg-background/60 p-6 backdrop-blur'>
                                        <SheetTitle>Top locations</SheetTitle>
                                        <SheetDescription>Where are the readers of this post</SheetDescription>
                                    </SheetHeader>
                                    <div className='group/datalist'>
                                        <LocationsTable
                                            data={data}
                                            tableHeader={true}
                                        />
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
