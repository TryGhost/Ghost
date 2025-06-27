import React, {useEffect} from 'react';
import {LucideIcon, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade';
import {STATS_RANGES, STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

interface DateRangeSelectProps {
    excludeRanges?: (keyof typeof STATS_RANGES)[];
}

const DateRangeSelect: React.FC<DateRangeSelectProps> = ({excludeRanges = []}) => {
    const {range, setRange} = useGlobalData();

    const excludeValues = excludeRanges.map(key => STATS_RANGES[key].value);
    const filteredOptions = STATS_RANGE_OPTIONS.filter(option => !excludeValues.includes(option.value)
    );

    // If the current range is excluded, switch to a sensible fallback
    useEffect(() => {
        if (excludeValues.includes(range) && filteredOptions.length > 0) {
            // Prefer "Last 7 days" if available, otherwise use the first available option
            const preferredFallback = filteredOptions.find(option => option.value === STATS_RANGES.last7Days.value);
            const fallbackRange = preferredFallback ? preferredFallback.value : filteredOptions[0].value;
            setRange(fallbackRange);
        }
    }, [range, excludeValues, filteredOptions, setRange]);

    return (
        <Select value={`${range}`} onValueChange={(value) => {
            setRange(Number(value));
        }}>
            <SelectTrigger>
                <LucideIcon.Calendar className='mr-2' size={16} strokeWidth={1.5} />
                <SelectValue placeholder="Select a period" />
            </SelectTrigger>
            <SelectContent align='end'>
                <SelectGroup>
                    <SelectLabel>Period</SelectLabel>
                    {filteredOptions.map(option => (
                        <SelectItem key={option.value} value={`${option.value}`}>
                            {option.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};

export default DateRangeSelect;
