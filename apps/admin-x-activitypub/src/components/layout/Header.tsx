import * as React from 'react';
import {H1} from '@tryghost/shade';

interface HeaderProps {
    route: string;
}

// TODO: replace with React router
const getTitle = (route: string) => {
    switch (route) {
    case 'inbox':
        return 'Inbox';
        break;
    case 'feed':
        return 'Feed';
        break;
    case 'profile':
        return 'Profile';
        break;
    case 'notifications':
        return 'Notifications';
        break;

    default:
        return 'Inbox';
        break;
    }
};

const Header: React.FC<HeaderProps> = ({route}) => {
    return (
        <div
            className='fixed left-[320px] right-0 top-0 z-10 bg-white px-8'>
            <div className='flex h-[102px] items-center justify-between gap-5 border-b border-gray-200'>
                <H1>{getTitle(route)}</H1>
                <span className='flex h-9 w-[274px] items-center rounded-full bg-gray-200 px-4 text-gray-600'>Search</span>
            </div>
        </div>
    );
};

Header.displayName = 'Header';

export {Header};
