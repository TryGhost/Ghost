import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import {Circle} from 'lucide-react';

import {inputSurface} from '@/components/ui/input-surface';
import {cn} from '@/lib/utils';

const RadioGroup = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({className, ...props}, ref) => (
    <RadioGroupPrimitive.Root
        ref={ref}
        className={cn('grid gap-3', className)}
        data-slot="radio-group"
        {...props}
    />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({className, ...props}, ref) => (
    <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
            inputSurface('self'),
            'peer grid size-4 shrink-0 place-content-center rounded-full p-0 text-primary shadow-xs enabled:hover:bg-interactive-hover',
            className
        )}
        data-slot="radio-group-item"
        {...props}
    >
        <RadioGroupPrimitive.Indicator
            className="grid place-content-center"
            data-slot="radio-group-indicator"
        >
            <Circle className="size-2 fill-current" />
        </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export {RadioGroup, RadioGroupItem};
