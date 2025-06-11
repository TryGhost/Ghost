import React from 'react';
import {Skeleton} from './skeleton';

type LoadingIndicatorSize = 'sm' | 'md' | 'lg';
type LoadingIndicatorColor = 'dark' | 'light';

interface LoadingIndicatorProps {
    size: LoadingIndicatorSize;
    color?: LoadingIndicatorColor;
    className?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({size = 'md', color = 'dark', className = ''}) => {
    let styles = `relative mx-0 my-[-0.5] box-border inline-block animate-spin rounded-full before:z-10 before:block before:rounded-full before:content-['']`;

    switch (size) {
    case 'sm':
        styles += ' h-[16px] w-[16px] border-2 before:mt-[10px] before:h-[3px] before:w-[3px]';
        break;
    case 'md':
        styles += ' h-[20px] w-[20px] border-2 before:mt-[13px] before:h-[3px] before:w-[3px]';
        break;
    case 'lg':
    default:
        styles += ' h-[50px] w-[50px] border before:mt-[7px] before:h-[7px] before:w-[7px]';
        break;
    }

    switch (color) {
    case 'light':
        styles += ' border-white/20 before:bg-white dark:border-black/10 dark:before:bg-black';
        break;
    case 'dark':
    default:
        styles += ' border-black/10 before:bg-black dark:border-white/20 dark:before:bg-white';
        break;
    }

    return <div className={`${styles} ${className}`} />;
};

const BarChartLoadingIndicator: React.FC = () => {
    return (
        <div className='flex h-full flex-col items-center justify-center gap-3'>
            <div className='flex size-20 items-center justify-center rounded-full'>
                <div className='-mt-1.5 flex items-end gap-2'>
                    <Skeleton className='h-10 w-3' />
                    <Skeleton className='h-14 w-3' />
                    <Skeleton className='h-6 w-3' />
                </div>
            </div>
        </div>
    );
};

export {
    LoadingIndicator,
    BarChartLoadingIndicator
};
