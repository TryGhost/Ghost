'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const toggleVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm dark:hover:bg-background [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5px]',
    {
        variants: {
            variant: {
                default: 'bg-transparent'
            },
            size: {
                default: 'h-[26px] min-w-[26px] px-2',
                button: 'h-[32px] min-w-[32px] px-3'
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
