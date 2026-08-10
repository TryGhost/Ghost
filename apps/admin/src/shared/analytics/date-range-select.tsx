import React, {useEffect} from 'react';
import {LucideIcon} from '@tryghost/shade/utils';
import {STATS_RANGES, STATS_RANGE_OPTIONS} from './constants';
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade/components';

interface DateRangeSelectProps {
    range: number;
    onRangeChange: (value: number) => void;
    excludeRanges?: (keyof typeof STATS_RANGES)[];
}

const DateRangeSelect: React.FC<DateRangeSelectProps> = ({range, onRangeChange, excludeRanges = []}) => {
    const excludeValues = excludeRanges.map(key => STATS_RANGES[key].value);
    const filteredOptions = STATS_RANGE_OPTIONS.filter(option => !excludeValues.includes(option.value)
    );

    // If the current range is excluded, switch to a sensible fallback
    useEffect(() => {
        if (excludeValues.includes(range) && filteredOptions.length > 0) {
            // Prefer "Last 7 days" if available, otherwise use the first available option
            const preferredFallback = filteredOptions.find(option => option.value === STATS_RANGES.last7Days.value);
            const fallbackRange = preferredFallback ? preferredFallback.value : filteredOptions[0].value;
            onRangeChange(fallbackRange);
        }
    }, [range, excludeValues, filteredOptions, onRangeChange]);

    return (
        <Select value={`${range}`} onValueChange={(value) => {
            onRangeChange(Number(value));
        }}>
            <SelectTrigger className='w-auto'>
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
