import React from 'react';
import {LucideIcon, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade';
import {STATS_RANGES} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/PostAnalyticsContext';

const DateRangeSelect: React.FC = () => {
    const {range, setRange} = useGlobalData();

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
                    {Object.values(STATS_RANGES).map(option => (
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
