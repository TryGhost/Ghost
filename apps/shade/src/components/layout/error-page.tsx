import {cn} from '@/lib/utils';
import * as React from 'react';

export interface ErrorPageProps
    extends React.HTMLAttributes<HTMLDivElement> {
    onBackToDashboard?: () => void;
}

const ErrorPage = React.forwardRef<HTMLDivElement, ErrorPageProps>(
    ({className, onBackToDashboard, ...props}, ref) => {
        return (
            <div
                ref={ref}
                className={cn('admin-x-container-error', className)}
                {...props}
            >
                <div className="admin-x-error max-w-xl">
                    <h1>Loading interrupted</h1>
                    <p>They say life is a series of trials and tribulations. This moment right here? It&apos;s a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back to the dashboard to try again.</p>
                    <a className='cursor-pointer text-green' onClick={onBackToDashboard}>&larr; Back to the dashboard</a>
                </div>
            </div>
        );
    }
);

ErrorPage.displayName = 'ErrorPage';

export {ErrorPage};
