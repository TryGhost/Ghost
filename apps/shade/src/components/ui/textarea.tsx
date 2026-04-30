import * as React from 'react';

import {cn} from '@/lib/utils';
import {surfaceField} from '@/components/ui/surface-field';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({className, ...props}, ref) => {
    return (
        <textarea
            ref={ref}
            className={cn(
                surfaceField('self'),
                'flex min-h-[80px] w-full px-3 py-2 text-base placeholder:text-muted-foreground',
                className
            )}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export {Textarea};
