import React from 'react';
import {H1} from '@tryghost/shade';

interface HeaderActionsProps extends React.HTMLAttributes<HTMLElement> {
}

const HeaderActions:React.FC<HeaderActionsProps> = ({children}) => {
    return (
        <div className='flex items-center gap-2'>
            {children}
        </div>
    );
};

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
}

const Header:React.FC<HeaderProps> = ({children}) => {
    const [firstChild, secondChild] = React.Children.toArray(children);

    return (
        <header className='sticky top-0 z-50 -mx-8 bg-white/85 backdrop-blur-md dark:bg-black'>
            <div className='relative flex h-[102px] items-center justify-between gap-5 px-8 before:absolute before:inset-x-8 before:bottom-0 before:block before:border-b before:border-gray-200 before:content-[""] before:dark:border-gray-950'>
                <H1>{firstChild}</H1>
                {secondChild}
            </div>
        </header>
    );
};

export {Header, HeaderActions};