import * as React from 'react';

import {cn} from '@/lib/utils';
import {inputSurface} from '@/components/ui/input-surface';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({className, ...props}, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                inputSurface('self'),
                'flex min-h-[80px] w-full px-3 py-2 text-base placeholder:text-muted-foreground',
                className
            )}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export {Textarea};
