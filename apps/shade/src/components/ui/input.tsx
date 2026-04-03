import * as React from 'react';

import {cn} from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
    ({className, type, ...props}, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    'flex h-9 w-full rounded-md border border-border-default bg-surface-elevated px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:bg-transparent focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/25 disabled:cursor-not-allowed disabled:opacity-50',
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
