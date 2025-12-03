import React, {useMemo, useState} from 'react';
import World from '@svg-maps/world';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, DataList, DataListBar, DataListBody, DataListHead, DataListHeader, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, EmptyIndicator, Flag, Icon, LucideIcon, SimplePagination, SimplePaginationNavigation, SimplePaginationNextButton, SimplePaginationPages, SimplePaginationPreviousButton, SkeletonTable, cn, formatNumber, formatPercentage, useSimplePagination} from '@tryghost/shade';
import {STATS_LABEL_MAPPINGS, UNKNOWN_LOCATION_VALUES} from '@src/utils/constants';
import {SVGMap} from 'react-svg-map';
import {getPeriodText} from '@src/utils/chart-helpers';

countries.registerLocale(enLocale);
const getCountryName = (label: string) => {
    return STATS_LABEL_MAPPINGS[label as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(label, 'en') || 'Unknown';
};

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

interface TooltipData {
    countryCode: string;
    countryName: string;
    visits: number;
    x: number;
    y: number;
}

interface ProcessedLocationData {
    location: string;
    visits: number;
    percentage: number;
    relativeValue: number;
}

interface LocationsCardProps {
    data: Array<{location?: string | number; visits?: number; [key: string]: unknown}> | null | undefined;
    isLoading: boolean;
    range: number;
    onLocationClick?: (location: string) => void;
}

const LocationsCard: React.FC<LocationsCardProps> = ({data, isLoading, range, onLocationClick}) => {
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    const ITEMS_PER_PAGE = 10;

    const totalVisits = useMemo(() => data?.reduce((sum, row) => sum + Number(row.visits), 0) || 0,
        [data]
    );

    const processedData = useMemo<ProcessedLocationData[]>(() => {
        // First calculate total visits for known locations only
        const knownTotalVisits = data?.reduce((sum, row) => (UNKNOWN_LOCATION_VALUES.includes(String(row.location)) ? sum : sum + Number(row.visits)), 0) || 0;

        const processed = data?.map(row => ({
            location: String(row.location),
            visits: Number(row.visits),
            percentage: totalVisits > 0 ? (Number(row.visits) / totalVisits) : 0,
            relativeValue: (UNKNOWN_LOCATION_VALUES.includes(String(row.location)) || knownTotalVisits === 0) ? 0 :
                Math.min(100, Math.max(10, Math.ceil((Number(row.visits) / knownTotalVisits) * 100 / 10) * 10)),
            isUnknown: UNKNOWN_LOCATION_VALUES.includes(String(row.location))
        })) || [];

        // Separate known and unknown locations
        const knownLocations = processed.filter(item => !item.isUnknown);
        const unknownLocations = processed.filter(item => item.isUnknown);

        // Combine unknown locations into a single entry
        const combinedUnknown = unknownLocations.length > 0 ? [{
            location: 'Unknown',
            visits: unknownLocations.reduce((sum, item) => sum + item.visits, 0),
            percentage: unknownLocations.reduce((sum, item) => sum + item.percentage, 0),
            relativeValue: 0
        }] : [];

        // Combine and sort data
        return [...knownLocations, ...combinedUnknown].sort((a, b) => {
            if (a.location === 'Unknown' && b.location !== 'Unknown') {
                return 1;
            }
            if (a.location !== 'Unknown' && b.location === 'Unknown') {
                return -1;
            }
            return 0;
        });
    }, [data, totalVisits]);

    const {
        currentPage,
        totalPages,
        paginatedData: tableData,
        nextPage,
        previousPage,
        hasNextPage,
        hasPreviousPage
    } = useSimplePagination({
        data: processedData,
        itemsPerPage: ITEMS_PER_PAGE
    });

    // Map relative values to opacity classes (explicit for Tailwind purge)
    const opacityByValue: Record<number, string> = {
        10: 'opacity-40',
        20: 'opacity-40',
        30: 'opacity-45',
        40: 'opacity-50',
        50: 'opacity-60',
        60: 'opacity-65',
        70: 'opacity-70',
        80: 'opacity-75',
        90: 'opacity-95'
    };

    const getLocationClassName = (location: {id: string, name: string}) => {
        const countryCode = location.id.toUpperCase();
        const currentData = processedData.find(item => normalizeCountryCode(item.location) === countryCode);

        if (currentData) {
            const opacity = opacityByValue[currentData.relativeValue] || '';
            return cn('fill-[hsl(var(--chart-blue))]', opacity);
        }

        return 'fill-gray-300 dark:fill-gray-900/75';
    };

    const handleLocationMouseOver = (e: React.MouseEvent<SVGPathElement>) => {
        const target = e.target as SVGPathElement;
        const countryCode = target.getAttribute('id')?.toUpperCase() || '';
        const countryData = processedData.find(item => normalizeCountryCode(item.location) === countryCode);

        target.style.opacity = '0.75';

        setTooltipData({
            countryCode,
            countryName: getCountryName(countryCode),
            visits: countryData ? countryData.visits : 0,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleLocationMouseOut = (e: React.MouseEvent<SVGPathElement>) => {
        const target = e.target as SVGPathElement;
        target.style.opacity = '';
        setTooltipData(null);
    };

    const handleLocationClick = (e: React.MouseEvent<SVGPathElement>) => {
        const target = e.target as SVGPathElement;
        const countryCode = target.getAttribute('id')?.toUpperCase() || '';
        if (countryCode && onLocationClick) {
            onLocationClick(countryCode);
        }
    };

    const handleRowClick = (location: string) => {
        // Don't allow clicking on "Unknown" locations
        if (location !== 'Unknown' && onLocationClick) {
            onLocationClick(location);
        }
    };

    return (
        <Card className='p-0'>
            <CardHeader className='border-b'>
                <CardTitle>Top Locations</CardTitle>
                <CardDescription>A geographic breakdown of your readers {getPeriodText(range)}</CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
                <div className='flex flex-col lg:grid lg:grid-cols-2 lg:items-stretch'>
                    <div className='svg-map-container relative mx-auto w-full max-w-[740px] px-8 py-12 [&_.svg-map]:stroke-background'>
                        <SVGMap
                            locationClassName={getLocationClassName}
                            map={World}
                            onLocationClick={handleLocationClick}
                            onLocationMouseOut={handleLocationMouseOut}
                            onLocationMouseOver={handleLocationMouseOver}
                        />
                        {tooltipData && (
                            <div
                                className="pointer-events-none fixed z-50 min-w-[120px] rounded-lg border bg-background px-3 py-2 text-sm text-foreground shadow-lg transition-all duration-150 ease-in-out"
                                style={{
                                    left: tooltipData.x + 10,
                                    top: tooltipData.y + 10,
                                    transform: 'translate3d(0, 0, 0)'
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Flag countryCode={`${normalizeCountryCode(tooltipData.countryCode)}`} height='12px' width='20px' />
                                    <span className="font-medium">{tooltipData.countryName}</span>
                                </div>
                                <div className='mt-1 flex grow items-center justify-between gap-3'>
                                    <div className="text-sm text-muted-foreground">Visitors</div>
                                    <div className="font-mono font-medium">{formatNumber(tooltipData.visits)}</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className='group/datalist flex flex-col justify-between overflow-hidden px-6' data-testid='visitors-card'>
                        <DataList className='mb-6 grow lg:ml-4'>
                            <DataListHeader className='px-0 pt-8'>
                                <DataListHead>Country</DataListHead>
                                <DataListHead>Visitors</DataListHead>
                            </DataListHeader>
                            {isLoading
                                ?
                                <SkeletonTable className='mt-5' />
                                :
                                tableData && tableData.length > 0 ?
                                    <>
                                        <DataListBody>
                                            {tableData.map((row) => {
                                                const countryName = getCountryName(`${row.location}`) || 'Unknown';
                                                const isClickable = row.location !== 'Unknown' && onLocationClick;
                                                return (
                                                    <DataListRow
                                                        key={row.location || 'unknown'}
                                                        className={isClickable ? 'cursor-pointer transition-colors hover:bg-accent/50' : ''}
                                                        data-testid={`location-row-${row.location || 'unknown'}`}
                                                        onClick={isClickable ? () => handleRowClick(row.location) : undefined}
                                                    >
                                                        <DataListBar style={{
                                                            width: `${row.percentage ? Math.round(row.percentage * 100) : 0}%`
                                                        }}/>
                                                        <DataListItemContent className='group-hover/data:max-w-[calc(100%-140px)]'>
                                                            <div className='flex items-center space-x-3 overflow-hidden'>
                                                                <Flag
                                                                    countryCode={`${normalizeCountryCode(row.location as string)}`}
                                                                    data-testid='country-flag'
                                                                    fallback={
                                                                        <span className='flex h-[14px] w-[22px] items-center justify-center rounded-[2px] bg-black text-white'>
                                                                            <Icon.SkullAndBones className='size-3' />
                                                                        </span>
                                                                    }
                                                                />
                                                                <div className='truncate font-medium' data-testid='country-name'>{countryName}</div>
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
                                        {totalPages > 1 && (
                                            <SimplePagination className='mt-5'>
                                                <SimplePaginationPages currentPage={currentPage.toString()} totalPages={totalPages.toString()} />
                                                <SimplePaginationNavigation>
                                                    <SimplePaginationPreviousButton
                                                        disabled={!hasPreviousPage}
                                                        onClick={previousPage}
                                                    />
                                                    <SimplePaginationNextButton
                                                        disabled={!hasNextPage}
                                                        onClick={nextPage}
                                                    />
                                                </SimplePaginationNavigation>
                                            </SimplePagination>
                                        )}
                                    </>
                                    :
                                    <EmptyIndicator
                                        className='size-full py-20'
                                        title={`No visitors ${getPeriodText(range)}`}
                                    >
                                        <LucideIcon.MapPin strokeWidth={1.5} />
                                    </EmptyIndicator>
                            }
                        </DataList>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
};

export default LocationsCard;
