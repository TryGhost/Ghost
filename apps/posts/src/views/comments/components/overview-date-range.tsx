import React from 'react';
import {LucideIcon} from '@tryghost/shade/utils';
import {STATS_RANGES} from '@src/utils/constants';
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade/components';

interface OverviewDateRangeProps {
    range: number;
    onRangeChange: (value: number) => void;
}

const OPTIONS = Object.values(STATS_RANGES);

const OverviewDateRange: React.FC<OverviewDateRangeProps> = ({range, onRangeChange}) => {
    return (
        <Select value={`${range}`} onValueChange={value => onRangeChange(Number(value))}>
            <SelectTrigger className='w-auto'>
                <LucideIcon.Calendar className='mr-2' size={16} strokeWidth={1.5} />
                <SelectValue placeholder='Select a period' />
            </SelectTrigger>
            <SelectContent align='end'>
                <SelectGroup>
                    <SelectLabel>Period</SelectLabel>
                    {OPTIONS.map(option => (
                        <SelectItem key={option.value} value={`${option.value}`}>
                            {option.name}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
};

export default OverviewDateRange;
