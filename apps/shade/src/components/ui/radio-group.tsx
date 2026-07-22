import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import {Check} from 'lucide-react';
import {cva, type VariantProps} from 'class-variance-authority';

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

const radioGroupItemVariants = cva(
    [
        inputSurface('self'),
        'peer grid size-4 shrink-0 place-content-center rounded-full p-0 text-primary enabled:hover:bg-interactive-hover'
    ],
    {
        variants: {
            indicator: {
                dot: '',
                check: 'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground enabled:data-[state=checked]:hover:bg-primary'
            }
        },
        defaultVariants: {
            indicator: 'dot'
        }
    }
);

type RadioGroupItemProps = React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & VariantProps<typeof radioGroupItemVariants>;

const RadioGroupItem = React.forwardRef<
    React.ElementRef<typeof RadioGroupPrimitive.Item>,
    RadioGroupItemProps
>(({className, indicator = 'dot', ...props}, ref) => (
    <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(radioGroupItemVariants({indicator}), className)}
        data-slot="radio-group-item"
        {...props}
    >
        <RadioGroupPrimitive.Indicator
            className="grid place-content-center"
            data-slot="radio-group-indicator"
        >
            {indicator === 'check' ? <Check className="size-2.5 stroke-4" /> : <span className="size-2 rounded-full bg-current" data-slot="radio-group-dot" />}
        </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export {RadioGroup, RadioGroupItem, radioGroupItemVariants};
