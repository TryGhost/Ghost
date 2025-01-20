import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-sm border px-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground/70',
                destructive:
                    'border-transparent bg-destructive/20 text-destructive',
                success:
                    'border-transparent bg-green/20 text-green',
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
