import * as React from 'react';

import {cn} from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
    ({className, type, ...props}, ref) => {
        return (
            <input
                ref={ref}
                className={cn(
                    'flex h-9 w-full rounded-md border border-transparent bg-gray-150 dark:bg-gray-900 px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-transparent focus-visible:border-green focus-visible:shadow-[0_0_0_2px_rgba(48,207,67,.25)] disabled:cursor-not-allowed disabled:opacity-50',
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
