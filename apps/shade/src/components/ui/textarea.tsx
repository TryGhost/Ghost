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
                'flex min-h-[80px] w-full rounded-md border border-border-default bg-surface-elevated px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:bg-transparent focus-visible:border-focus-ring focus-visible:ring-2 focus-visible:ring-focus-ring/25 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export {Textarea};
