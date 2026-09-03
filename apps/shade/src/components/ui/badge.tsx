import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border font-semibold transition-colors focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 focus:outline-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground/70',
        destructive: 'border-transparent bg-destructive/20 text-destructive',
        success: 'border-transparent bg-green/20 text-green',
        warning: 'border-transparent bg-state-warning/20 text-yellow-600',
        outline: 'text-foreground',
      },
      size: {
        default: 'px-1.5 text-xs',
        sm: 'h-5 px-2 text-sm',
        md: 'h-6 px-2.5 text-sm',
      },
      shape: {
        rounded: 'rounded-xs',
        pill: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      shape: 'rounded',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, shape, size, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ shape, size, variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
