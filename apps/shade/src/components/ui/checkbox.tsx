import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import {Check} from 'lucide-react';

import {inputSurface} from '@/components/ui/input-surface';
import {cn} from '@/lib/utils';

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({className, ...props}, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
            inputSurface('self'),
            'peer grid size-4 shrink-0 place-content-center rounded-xs p-0 text-primary enabled:hover:bg-interactive-hover data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground enabled:data-[state=checked]:hover:bg-primary',
            className
        )}
        {...props}
    >
        <CheckboxPrimitive.Indicator
            className={cn('grid place-content-center text-current')}
        >
            <Check className="size-4" />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export {Checkbox};
