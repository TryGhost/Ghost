import * as React from 'react';
import {cn} from '@/lib/utils';
import {MetricValue} from '../../ui/metric-value';
import {TrendBadge} from '../../ui/trend-badge';

const KpiCardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div
            className={
                cn(
                    'flex flex-col border-r border-border last:border-none items-start gap-4 px-6 py-5 transition-all',
                    className
                )}
            {...props}
        >
            {children}
        </div>
    );
};

const KpiCardHeaderLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, color, ...props}) => {
    return (
        <div className={cn('flex h-[22px] items-center gap-1.5 text-base font-medium text-muted-foreground [&_svg]:size-4', className)} {...props}>
            {color && <div className='ml-1 size-2 rounded-full opacity-50' style={{backgroundColor: color}}></div>}
            {children}
        </div>
    );
};

interface KpiCardValueProps {
    value: string | number;
    diffDirection?: 'up' | 'down' | 'same' | 'empty' | 'hidden';
    diffValue?: string | number;
    diffTooltip?: React.ReactNode;
}

const KpiCardHeaderValue: React.FC<KpiCardValueProps> = ({value, diffDirection, diffValue, diffTooltip}) => {
    let trailing: React.ReactNode = null;
    if (diffDirection && diffDirection !== 'hidden') {
        if (diffDirection === 'empty') {
            // Reserves the same vertical space as a real trend badge without showing one.
            trailing = (
                <div
                    className='flex h-[22px] items-center px-1.5 text-xs leading-none font-medium'
                    data-testid='kpi-card-header-diff'
                >
                    {diffValue}
                </div>
            );
        } else {
            trailing = (
                <TrendBadge
                    data-testid='kpi-card-header-diff'
                    direction={diffDirection}
                    tooltip={diffTooltip}
                    value={diffValue ?? ''}
                />
            );
        }
    }
    return (
        <MetricValue
            trailing={trailing}
            value={value}
            valueTestId='kpi-card-header-value'
        />
    );
};

export {KpiCardHeader, KpiCardHeaderLabel, KpiCardHeaderValue};
