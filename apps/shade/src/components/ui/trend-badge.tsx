import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {TrendingDown, TrendingUp} from 'lucide-react';

import {cn} from '@/lib/utils';

const trendBadgeVariants = cva(
    'group/trend-badge inline-flex h-[22px] cursor-default items-center gap-1 rounded-xs px-1.5 text-xs',
    {
        variants: {
            direction: {
                up: 'bg-state-success/10 text-state-success',
                down: 'bg-state-danger/10 text-state-danger',
                same: 'bg-muted text-text-secondary',
                hidden: 'hidden'
            },
            interactive: {
                true: '',
                false: ''
            }
        },
        compoundVariants: [
            {direction: 'up', interactive: true, className: 'hover:bg-state-success/20'},
            {direction: 'down', interactive: true, className: 'hover:bg-state-danger/20'}
        ],
        defaultVariants: {
            direction: 'same',
            interactive: false
        }
    }
);

export interface TrendBadgeProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
        VariantProps<typeof trendBadgeVariants> {
    value: string | number;
    tooltip?: React.ReactNode;
}

const TrendBadge = React.forwardRef<HTMLDivElement, TrendBadgeProps>(
    ({className, direction = 'same', value, tooltip, ...props}, ref) => {
        if (direction === 'hidden') {
            return null;
        }

        const interactive = Boolean(tooltip);

        return (
            <div
                ref={ref}
                className={cn(
                    trendBadgeVariants({direction, interactive}),
                    tooltip && 'relative',
                    className
                )}
                {...props}
            >
                <span className='leading-none font-medium'>{value}</span>
                {direction === 'up' && (
                    <TrendingUp className='size-3!' size={14} strokeWidth={2} />
                )}
                {direction === 'down' && (
                    <TrendingDown className='size-3!' size={14} strokeWidth={2} />
                )}
                {tooltip && (
                    <div className='pointer-events-none absolute inset-x-0 top-0 z-50 w-full max-w-[240px] -translate-y-full rounded-xs bg-background px-3 py-2 text-sm text-pretty text-foreground opacity-0 shadow-md transition-all group-hover/trend-badge:translate-y-[calc(-100%-8px)] group-hover/trend-badge:opacity-100'>
                        {tooltip}
                    </div>
                )}
            </div>
        );
    }
);
TrendBadge.displayName = 'TrendBadge';

export {TrendBadge, trendBadgeVariants};
