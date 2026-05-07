import {STATS_RANGES} from '@src/utils/constants';
import {formatQueryDate, getRangeDates} from '@tryghost/shade/app';
import {useMemo, useState} from 'react';

const DEFAULT_RANGE = STATS_RANGES.LAST_30_DAYS.value;

export const useOverviewRange = (initialRange: number = DEFAULT_RANGE) => {
    const [range, setRange] = useState<number>(initialRange);

    const {dateFrom, dateTo, timezone} = useMemo(() => {
        const queryRange = range === STATS_RANGES.YEAR_TO_DATE.value ? -1 : range;
        const {startDate, endDate, timezone: tz} = getRangeDates(queryRange);
        return {
            dateFrom: formatQueryDate(startDate),
            dateTo: formatQueryDate(endDate),
            timezone: tz
        };
    }, [range]);

    return {range, setRange, dateFrom, dateTo, timezone};
};
