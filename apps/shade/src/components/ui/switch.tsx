import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const switchVariants = cva(
    'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=checked]:bg-green-500',
    {
        variants: {
            size: {
                default: 'h-4 w-7',
                sm: 'h-3 w-5'
            }
        },
        defaultVariants: {
            size: 'default'
        }
    }
);

const switchThumbVariants = cva(
    'pointer-events-none block rounded-full bg-background ring-0 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.07))] transition-transform data-[state=unchecked]:translate-x-0 dark:bg-white',
    {
        variants: {
            size: {
                default: 'size-3 data-[state=checked]:translate-x-3',
                sm: 'size-2 data-[state=checked]:translate-x-2'
            }
        },
        defaultVariants: {
            size: 'default'
        }
    }
);

export interface SwitchProps
    extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    SwitchProps
>(({className, size, ...props}, ref) => (
    <SwitchPrimitives.Root
        className={cn(switchVariants({size, className}))}
        {...props}
        ref={ref}
    >
        <SwitchPrimitives.Thumb
            className={cn(switchThumbVariants({size}))}
        />
    </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export {Switch};
