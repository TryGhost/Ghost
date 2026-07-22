import DateRangeSelect from '@/shared/analytics/date-range-select';
import React from 'react';
import {type STATS_RANGES} from '@/shared/analytics/constants';
import {useAnalytics} from '@/analytics/providers/analytics-context';

interface StatsDateRangeSelectProps {
    excludeRanges?: (keyof typeof STATS_RANGES)[];
}

// Thin binding of the shared DateRangeSelect to the site-wide analytics
// view-state, so the many call sites don't each have to read the context.
const StatsDateRangeSelect: React.FC<StatsDateRangeSelectProps> = ({excludeRanges}) => {
    const {range, setRange} = useAnalytics();

    return <DateRangeSelect excludeRanges={excludeRanges} range={range} onRangeChange={setRange} />;
};

export default StatsDateRangeSelect;
