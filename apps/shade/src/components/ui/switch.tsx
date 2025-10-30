import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const switchVariants = cva(
    'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
    {
        variants: {
            size: {
                default: 'h-5 w-9',
                sm: 'h-4 w-7'
            }
        },
        defaultVariants: {
            size: 'default'
        }
    }
);

const switchThumbVariants = cva(
    'pointer-events-none block rounded-full bg-background ring-0 transition-transform [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.07))] data-[state=unchecked]:translate-x-0',
    {
        variants: {
            size: {
                default: 'size-4 data-[state=checked]:translate-x-4',
                sm: 'size-3 data-[state=checked]:translate-x-3'
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
