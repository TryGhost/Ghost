import React from 'react';
import {Skeleton} from '@tryghost/shade';

const LoadingIndicator: React.FC = () => {
    return (
        <div className='flex h-full flex-col items-center justify-center gap-3'>
            <div className='-mt-10 flex size-20 items-center justify-center rounded-full'>
                <div className='-mt-1.5 flex items-end gap-2'>
                    <Skeleton className='h-10 w-3' />
                    <Skeleton className='h-14 w-3' />
                    <Skeleton className='h-6 w-3' />
                </div>
            </div>
        </div>
    );
};

export default LoadingIndicator;