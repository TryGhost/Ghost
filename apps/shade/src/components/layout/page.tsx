import {cn} from '@/lib/utils';
import * as React from 'react';

export interface PageProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const Page = React.forwardRef<HTMLDivElement, PageProps>(
    ({className, ...props}, ref) => {
        return (
            <div
                ref={ref}
                className={cn('max-w-page mx-auto w-full min-h-full px-8 flex flex-col', className)}
                {...props}
            />
        );
    }
);

Page.displayName = 'Page';

export {Page};
