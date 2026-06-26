'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const toggleVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-md text-control font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-foreground focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm dark:data-[state=on]:bg-tab-active [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]',
    {
        variants: {
            variant: {
                default: 'bg-transparent'
            },
            size: {
                default: 'h-[calc(var(--control-height)-2px)] min-w-[26px] px-2',
                button: 'h-[calc(var(--control-height)-2px)] min-w-[32px] px-3'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'default'
        }
    }
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({className, variant, size, ...props}, ref) => (
    <TogglePrimitive.Root
        ref={ref}
        className={cn(toggleVariants({variant, size, className}))}
        {...props}
    />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export {Toggle, toggleVariants};
