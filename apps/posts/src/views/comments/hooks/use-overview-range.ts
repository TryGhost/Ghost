import {STATS_RANGES} from '@src/utils/constants';
import {formatQueryDate, getRangeDates} from '@tryghost/shade/app';
import {useMemo, useState} from 'react';

const DEFAULT_RANGE = STATS_RANGES.LAST_30_DAYS.value;

export const useOverviewRange = () => {
    const [range, setRange] = useState<number>(DEFAULT_RANGE);

    const {dateFrom, dateTo} = useMemo(() => {
        const {startDate, endDate} = getRangeDates(range);
        return {
            dateFrom: formatQueryDate(startDate),
            dateTo: formatQueryDate(endDate)
        };
    }, [range]);

    return {range, setRange, dateFrom, dateTo};
};
