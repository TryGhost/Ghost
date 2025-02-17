import * as React from 'react';
import {Button, H1, LucideIcon} from '@tryghost/shade';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
    case 'search':
        return 'Search';
        break;

    default:
        return 'Inbox';
        break;
    }
};

const Header: React.FC<HeaderProps> = ({route}) => {
    const {updateRoute} = useRouting();

    return (
        <div
            className='fixed left-[320px] right-0 top-0 z-10 bg-white px-8'>
            <div className='flex h-[102px] items-center justify-between gap-5 border-b border-gray-200'>
                <H1>{getTitle(route)}</H1>
                <Button className='h-9 w-[274px] justify-start rounded-full bg-gray-100 text-md text-gray-600 hover:bg-gray-200 hover:text-gray-600 [&_svg]:size-[18px]' variant='ghost' onClick={() => updateRoute('search')}>
                    <LucideIcon.Search size={18} strokeWidth={1.5} />
                    Search
                </Button>
            </div>
        </div>
    );
};

Header.displayName = 'Header';

export {Header};
