import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const badgeVariants = cva(
    'focus:outline-hidden focus:ring-ring inline-flex items-center rounded-sm border px-1.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground border-transparent',
                secondary:
                    'bg-secondary text-secondary-foreground/70 border-transparent',
                destructive:
                    'bg-destructive/20 text-destructive border-transparent',
                success:
                    'bg-green/20 text-green border-transparent',
                outline: 'text-foreground'
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
);

export interface BadgeProps
extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({className, variant, ...props}: BadgeProps) {
    return (
        <div className={cn(badgeVariants({variant}), className)} {...props} />
    );
}

export {Badge, badgeVariants};
