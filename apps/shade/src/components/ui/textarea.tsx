import * as React from 'react';

import {cn} from '@/lib/utils';
import {inputSurface, inputSurfaceClasses} from '@/components/ui/input-surface';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({className, ...props}, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                inputSurface('self'),
                inputSurfaceClasses.disabledFieldSelf,
                'flex min-h-[80px] w-full max-w-none px-3 py-2 text-base placeholder:text-muted-foreground',
                className
            )}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export {Textarea};
