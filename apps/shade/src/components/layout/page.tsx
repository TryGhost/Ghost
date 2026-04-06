import {Container} from '@/components/primitives';
import {cn} from '@/lib/utils';
import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PageProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * @deprecated Prefer composing new surfaces with `Container`, `Stack`, and other primitives directly.
 */
const Page = React.forwardRef<HTMLDivElement, PageProps>(
    ({className, ...props}, ref) => {
        return (
            <Container
                ref={ref}
                className={cn('min-h-full flex flex-col', className)}
                paddingX='2xl'
                size='page'
                {...props}
            />
        );
    }
);

Page.displayName = 'Page';

export {Page};
