import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

/**
 * A lightweight status dot component for showing visual status indicators
 * with semantic colors and animation states.
 */
const indicatorVariants = cva(
    'rounded-full',
    {
        variants: {
            variant: {
                neutral: 'bg-muted',
                info: 'bg-state-info',
                success: 'bg-state-success',
                error: 'bg-state-danger',
                warning: 'bg-state-warning'
            },
            state: {
                idle: '',
                active: 'animate-pulse',
                inactive: 'border-2 bg-transparent'
            },
            size: {
                sm: 'size-2',
                md: 'size-3',
                lg: 'size-4'
            }
        },
        compoundVariants: [
            // Inactive state borders match variant colors
            {
                variant: 'neutral',
                state: 'inactive',
                className: 'border-muted-foreground'
            },
            {
                variant: 'info',
                state: 'inactive',
                className: 'border-state-info'
            },
            {
                variant: 'success',
                state: 'inactive',
                className: 'border-state-success'
            },
            {
                variant: 'error',
                state: 'inactive',
                className: 'border-state-danger'
            },
            {
                variant: 'warning',
                state: 'inactive',
                className: 'border-state-warning'
            }
        ],
        defaultVariants: {
            variant: 'success',
            state: 'idle',
            size: 'sm'
        }
    }
);

export interface IndicatorProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof indicatorVariants> {
    label?: string;
}

function Indicator({className, variant, state, size, label, ...props}: IndicatorProps) {
    return (
        <span className="inline-flex items-center" {...props}>
            <span
                aria-hidden="true"
                className={cn(indicatorVariants({variant, state, size}), className)}
            />
            {label && <span className="sr-only">{label}</span>}
        </span>
    );
}

export {Indicator, indicatorVariants};
