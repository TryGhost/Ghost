import {STATS_RANGES} from '@src/utils/constants';
import {formatQueryDate, getRangeDates} from '@tryghost/shade/app';
import {useMemo, useState} from 'react';

const DEFAULT_RANGE = STATS_RANGES.LAST_30_DAYS.value;

export const useOverviewRange = () => {
    const [range, setRange] = useState<number>(DEFAULT_RANGE);

    const {dateFrom, dateTo, timezone} = useMemo(() => {
        const {startDate, endDate, timezone: tz} = getRangeDates(range);
        return {
            dateFrom: formatQueryDate(startDate),
            dateTo: formatQueryDate(endDate),
            timezone: tz
        };
    }, [range]);

    return {range, setRange, dateFrom, dateTo, timezone};
};
