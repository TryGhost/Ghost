import {cn} from '@/lib/utils';
import * as React from 'react';

export interface ErrorPageProps
    extends React.HTMLAttributes<HTMLDivElement> {}

const ErrorPage = React.forwardRef<HTMLDivElement, ErrorPageProps>(
    ({className, ...props}, ref) => {
        return (
            <div
                ref={ref}
                className={cn('max-w-page mx-auto w-full min-h-full px-8 flex flex-col', className)}
                {...props}
            >
                <h1>Error</h1>
            </div>
        );
    }
);

ErrorPage.displayName = 'ErrorPage';

export {ErrorPage};
