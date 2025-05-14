import React from 'react';
import {LucideIcon, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade';
import {STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

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
                    {STATS_RANGE_OPTIONS.map(option => (
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
