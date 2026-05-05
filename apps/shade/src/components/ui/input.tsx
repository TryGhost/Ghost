import * as React from 'react';

import {cn} from '@/lib/utils';
import {inputSurface} from '@/components/ui/input-surface';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
    ({className, type, ...props}, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    inputSurface('self'),
                    'flex h-9 w-full px-3 py-1 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground',
                    className
                )}
                type={type}
                {...props}
            />
        );
    }
);
Input.displayName = 'Input';

export {Input};
