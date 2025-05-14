import {cn} from '@/lib/utils';
import React from 'react';

interface ViewHeaderActionsProps extends React.HTMLAttributes<HTMLElement> {
}

const ViewHeaderActions:React.FC<ViewHeaderActionsProps> = ({children}) => {
    return (
        <div className='flex items-center gap-2'>
            {children}
        </div>
    );
};

interface ViewHeaderProps extends React.HTMLAttributes<HTMLElement> {
    className?: string;
}

const ViewHeader:React.FC<ViewHeaderProps> = ({className, children}) => {
    const [headerComponent, actionsComponent] = React.Children.toArray(children);

    return (
        <header className='sticky top-0 z-50 -mx-8 bg-white/70 backdrop-blur-md dark:bg-black'>
            <div className={cn('relative flex min-h-[102px] items-center justify-between gap-5 p-8 before:absolute before:inset-x-8 before:bottom-0 before:block before:border-b before:border-gray-200 before:content-[""] before:dark:border-gray-950', className)}>
                {headerComponent}
                {actionsComponent}
            </div>
        </header>
    );
};

export {ViewHeader, ViewHeaderActions};