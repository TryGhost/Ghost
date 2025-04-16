import AudienceSelect, {getAudienceQueryParam} from './components/AudienceSelect';
import DateRangeSelect from './components/DateRangeSelect';
import React, {useState} from 'react';
import StatsLayout from './layout/StatsLayout';
import StatsView from './layout/StatsView';
import World from '@svg-maps/world';
import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import {Card, CardContent, CardDescription, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn} from '@tryghost/shade';
import {Header, HeaderActions} from '@src/components/layout/Header';
import {STATS_LABEL_MAPPINGS} from '@src/utils/constants';
import {SVGMap} from 'react-svg-map';
import {formatNumber, formatQueryDate} from '@src/utils/data-formatters';
import {getCountryFlag, getRangeDates} from '@src/utils/chart-helpers';
import {getStatEndpointUrl} from '@src/config/stats-config';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {useQuery} from '@tinybirdco/charts';

countries.registerLocale(enLocale);
const getCountryName = (label: string) => {
    return STATS_LABEL_MAPPINGS[label as keyof typeof STATS_LABEL_MAPPINGS] || countries.getName(label, 'en') || 'Unknown';
};

interface TooltipData {
    countryCode: string;
    countryName: string;
    visits: number;
    x: number;
    y: number;
}

const Locations:React.FC = () => {
    const {data: configData, isLoading: isConfigLoading} = useGlobalData();
    const {range, audience} = useGlobalData();
    const {startDate, endDate, timezone} = getRangeDates(range);
    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

    const params = {
        site_uuid: configData?.config.stats?.id || '',
        date_from: formatQueryDate(startDate),
        date_to: formatQueryDate(endDate),
        timezone: timezone,
        member_status: getAudienceQueryParam(audience)
    };

    const {data, loading} = useQuery({
        endpoint: getStatEndpointUrl(configData?.config.stats?.endpoint, 'api_top_locations'),
        token: configData?.config.stats?.token || '',
        params
    });

    const isLoading = isConfigLoading || loading;

    interface LocationData {
        location: string;
        visits: string;
    }

    interface TransformedLocationData extends LocationData {
        relativeValue: number;
    }

    const transformData = (rawData: LocationData[] | null): Record<string, TransformedLocationData> => {
        if (!rawData) {
            return {};
        }

        // Filter out "ᴺᵁᴸᴸ" entries for calculations
        const validData = rawData.filter(item => item.location !== 'ᴺᵁᴸᴸ');

        // Find the maximum number of visits
        const maxVisits = validData.reduce((max, item) => Math.max(max, Number(item.visits)), 0);

        // Transform all data into an object with location codes as keys
        return rawData.reduce((acc, item) => {
            if (item.location === 'ᴺᵁᴸᴸ') {
                return acc;
            }

            // Calculate percentage relative to max visits
            const percentage = (Number(item.visits) / maxVisits) * 100;
            // Map percentage to 10-100 scale in increments of 10
            const relativeValue = Math.min(100, Math.max(10, Math.ceil(percentage / 10) * 10));

            acc[item.location] = {
                ...item,
                relativeValue
            };

            return acc;
        }, {} as Record<string, TransformedLocationData>);
    };

    const transformedData = transformData(data as LocationData[] | null);

    const getLocationClassName = (location: {id: string, name: string}) => {
        const countryCode = location.id.toUpperCase();
        const currentData = transformedData[countryCode];
        if (currentData) {
            let opacity = '';

            // We have to do this manually because dynamic classnames are not interpreted by TailwindCSS
            switch (currentData.relativeValue) {
            case 10:
                opacity = 'opacity-10';
                break;
            case 20:
                opacity = 'opacity-20';
                break;
            case 30:
                opacity = 'opacity-30';
                break;
            case 40:
                opacity = 'opacity-40';
                break;
            case 50:
                opacity = 'opacity-50';
                break;
            case 60:
                opacity = 'opacity-60';
                break;
            case 70:
                opacity = 'opacity-70';
                break;
            case 80:
                opacity = 'opacity-80';
                break;
            case 90:
                opacity = 'opacity-90';
                break;
            }
            return cn('fill-[hsl(var(--chart-1))]', opacity);
        }

        return 'fill-gray-300';
    };

    const handleLocationMouseOver = (e: React.MouseEvent<SVGPathElement>) => {
        const target = e.target as SVGPathElement;
        const countryCode = target.getAttribute('id')?.toUpperCase() || '';
        const countryName = target.getAttribute('name') || '';
        const countryData = transformedData[countryCode];

        target.style.opacity = '0.75';

        setTooltipData({
            countryCode,
            countryName,
            visits: countryData ? Number(countryData.visits) : 0,
            x: e.clientX,
            y: e.clientY
        });
    };

    const handleLocationMouseOut = (e: React.MouseEvent<SVGPathElement>) => {
        const target = e.target as SVGPathElement;
        target.style.opacity = '';
        setTooltipData(null);
    };

    return (
        <StatsLayout>
            <Header>
                Locations
                <HeaderActions>
                    <AudienceSelect />
                    <DateRangeSelect />
                </HeaderActions>
            </Header>
            <StatsView data={data} isLoading={isLoading}>
                <Card variant='plain'>
                    <CardContent className='-mb-5 border-none pt-8'>
                        <div className='svg-map-container relative mx-auto max-w-[680px]'>
                            <SVGMap
                                locationClassName={getLocationClassName}
                                map={World}
                                onLocationMouseOut={handleLocationMouseOut}
                                onLocationMouseOver={handleLocationMouseOver}
                            />
                            {tooltipData && (
                                <div
                                    className="pointer-events-none fixed z-50 min-w-[120px] rounded-lg border bg-white px-3 py-2 text-sm shadow-lg transition-all duration-150 ease-in-out"
                                    style={{
                                        left: tooltipData.x + 10,
                                        top: tooltipData.y + 10,
                                        transform: 'translate3d(0, 0, 0)'
                                    }}
                                >
                                    <div className="flex gap-1">
                                        <span>{getCountryFlag(tooltipData.countryCode)}</span>
                                        <span className="font-medium">{tooltipData.countryName}</span>
                                    </div>
                                    <div className='flex grow items-center justify-between gap-3'>
                                        <div className="text-sm text-gray-800">Visitors</div>
                                        <div className="font-mono font-medium">{formatNumber(tooltipData.visits)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card variant='plain'>
                    <CardHeader>
                        <CardTitle>All locations</CardTitle>
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
                                        const countryName = getCountryName(`${row.location}`) || 'Unknown';
                                        return (
                                            <TableRow key={row.location || 'unknown'}>
                                                <TableCell className="font-medium">
                                                    <span title={countryName || 'Unknown'}>{getCountryFlag(`${row.location}`)} {countryName}</span>
                                                </TableCell>
                                                <TableCell>{formatNumber(Number(row.visits))}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        }
                    </CardContent>
                </Card>
            </StatsView>
        </StatsLayout>
    );
};

export default Locations;
