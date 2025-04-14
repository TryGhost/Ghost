import React from 'react';
import {STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade';
import {useGlobalData} from '@src/providers/GlobalDataProvider';

const DateRangeSelect: React.FC = () => {
    const {range, setRange} = useGlobalData();

    return (
        <Select value={`${range}`} onValueChange={(value) => {
            setRange(Number(value));
        }}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a period" />
            </SelectTrigger>
            <SelectContent>
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
