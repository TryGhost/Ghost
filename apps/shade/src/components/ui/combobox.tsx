import * as React from 'react';
import {ChevronDown} from 'lucide-react';

import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {inputSurface} from '@/components/ui/input-surface';
import {cn} from '@/lib/utils';

const Combobox = Popover;

const ComboboxTrigger = React.forwardRef<
    HTMLButtonElement,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'>
>(({children, className, ...props}, ref) => (
    <PopoverTrigger asChild>
        <button
            ref={ref}
            className={cn(
                inputSurface('self'),
                'flex h-(--control-height) w-full min-w-0 items-center justify-between px-3 text-control hover:bg-button-hover',
                className
            )}
            role='combobox'
            {...props}
            type='button'
        >
            {children}
            <ChevronDown className='ml-2 size-4 shrink-0 opacity-50' />
        </button>
    </PopoverTrigger>
));
ComboboxTrigger.displayName = 'ComboboxTrigger';

interface ComboboxValueProps extends React.HTMLAttributes<HTMLSpanElement> {
    placeholder?: boolean;
}

const ComboboxValue = React.forwardRef<HTMLSpanElement, ComboboxValueProps>(({className, placeholder = false, ...props}, ref) => (
    <span
        ref={ref}
        className={cn('min-w-0 flex-1 truncate text-left', placeholder && 'text-muted-foreground', className)}
        {...props}
    />
));
ComboboxValue.displayName = 'ComboboxValue';

const ComboboxContent = React.forwardRef<
    React.ElementRef<typeof PopoverContent>,
    React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({align = 'start', className, ...props}, ref) => (
    <PopoverContent
        ref={ref}
        align={align}
        className={cn('z-[9999] w-(--radix-popover-trigger-width) p-0', className)}
        {...props}
    />
));
ComboboxContent.displayName = 'ComboboxContent';

export {Combobox, ComboboxContent, ComboboxTrigger, ComboboxValue};
