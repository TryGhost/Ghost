import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {TrendingDown, TrendingUp} from 'lucide-react';

import {cn} from '@/lib/utils';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';

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
                true: 'focus-visible:ring-2 focus-visible:ring-focus-ring/25 focus-visible:outline-hidden',
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

        const badge = (
            <div
                ref={ref}
                className={cn(
                    trendBadgeVariants({direction, interactive}),
                    className
                )}
                tabIndex={interactive ? 0 : undefined}
                {...props}
            >
                <span className='leading-none font-medium'>{value}</span>
                {direction === 'up' && (
                    <TrendingUp className='size-3!' strokeWidth={2} />
                )}
                {direction === 'down' && (
                    <TrendingDown className='size-3!' strokeWidth={2} />
                )}
            </div>
        );

        if (!tooltip) {
            return badge;
        }

        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>{badge}</TooltipTrigger>
                    <TooltipContent className='max-w-[240px] bg-background text-sm text-pretty text-foreground shadow-md'>
                        {tooltip}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
);
TrendBadge.displayName = 'TrendBadge';

export {TrendBadge, trendBadgeVariants};
