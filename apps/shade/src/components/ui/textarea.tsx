import * as React from 'react';

import {cn} from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({className, ...props}, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                'flex min-h-[80px] w-full rounded-md border border-transparent bg-gray-150 dark:bg-gray-900 px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-transparent focus-visible:border-green focus-visible:shadow-[0_0_0_2px_rgba(48,207,67,.25)] disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export {Textarea};
