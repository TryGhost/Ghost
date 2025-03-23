import * as React from 'react';
import {cn} from '@tryghost/shade';

export interface metricDivProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const Metric = ({className, ...props}: metricDivProps) => {
    return (
        <div className={cn('flex flex-col gap-0.5', className)} {...props} />
    );
};

const MetricLabel = ({className, ...props}: metricDivProps) => {
    return (
        <div className={cn('text-sm text-gray-700 font-medium', className)} {...props} />
    );
};

const MetricValue = ({className, ...props}: metricDivProps) => {
    return (
        <div className={cn('inline-flex gap-2 items-center font-semibold text-2xl tracking-tight leading-none', className)} {...props} />
    );
};

const MetricPercentage = ({className, ...props}: metricDivProps) => {
    return (
        <div className={cn('text-xs tracking-normal inline-block bg-gray-100 text-gray-700 p-1 rounded-md', className)} {...props} />
    );
};

export {Metric, MetricLabel, MetricValue, MetricPercentage};
