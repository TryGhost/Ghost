import React from 'react';
import {Filter, FilterFieldsConfig, Filters} from '@tryghost/shade';

interface StatsFilterProps<T = unknown> {
    filters: Filter<T>[];
    fields: FilterFieldsConfig<T>;
    onChange: (filters: Filter<T>[]) => void;
    className?: string;
}

const StatsFilter = <T = unknown,>({
    filters,
    fields,
    onChange,
    className
}: StatsFilterProps<T>) => {
    return (
        <Filters
            className={className}
            fields={fields}
            filters={filters}
            onChange={onChange}
        />
    );
};

export default StatsFilter;
