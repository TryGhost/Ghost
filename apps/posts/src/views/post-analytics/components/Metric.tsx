import * as React from 'react';
import {cn} from '@tryghost/shade';

export interface MetricDivProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const Metric = ({className, ...props}: MetricDivProps) => {
    return (
        <div className={cn('flex flex-col gap-0.5', className)} {...props} />
    );
};

const MetricLabel = ({className, ...props}: MetricDivProps) => {
    return (
        <div className={cn('text-sm text-neutral-700 font-medium', className)} {...props} />
    );
};

const MetricValue = ({className, ...props}: MetricDivProps) => {
    return (
        <div className={cn('inline-flex gap-2 items-center font-semibold text-xl tracking-tight leading-none', className)} {...props} />
    );
};

const MetricPercentage = ({className, ...props}: MetricDivProps) => {
    return (
        <div className={cn('text-xs tracking-normal inline-block bg-neutral-100 text-neutral-700 p-1 rounded-md', className)} {...props} />
    );
};

export {Metric, MetricLabel, MetricValue, MetricPercentage};
