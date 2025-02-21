import * as React from 'react';
import {Button, H1, LucideIcon} from '@tryghost/shade';
import {Link, useLocation} from '@tryghost/admin-x-framework';
import {ROUTE_TITLES} from '@src/routes';

interface HeaderTitleProps {
    title: string;
    backIcon: boolean;
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({title, backIcon}) => {
    if (backIcon) {
        return (
            <Button className='-ml-2 h-9 w-auto px-2 dark:text-white [&_svg]:size-6' variant='ghost' asChild>
                <Link to="/">
                    <LucideIcon.ArrowLeft size={24} strokeWidth={1} />
                </Link>
            </Button>
        );
    }
    return (
        <H1>{title}</H1>
    );
};

const Header: React.FC = () => {
    const location = useLocation();

    // Get page title from custom route object
    const title = ROUTE_TITLES[location.pathname] || 'Inbox';

    return (
        <div
            className='sticky top-0 z-10 bg-white px-8 dark:bg-black'>
            <div className='flex h-[102px] items-center justify-between gap-5 border-b border-gray-200 dark:border-gray-950'>
                <HeaderTitle backIcon={location.pathname === '/search'} title={title} />
                <Link className='inline-flex h-9 w-[274px] items-center justify-start gap-2 rounded-full bg-gray-100 px-3 text-md font-normal text-gray-600 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-925 dark:text-gray-700 dark:hover:bg-gray-950 [&_svg]:size-[18px]' to="/search">
                    <LucideIcon.Search size={18} strokeWidth={1.5} />
                        Search
                </Link>
            </div>
        </div>
    );
};

Header.displayName = 'Header';

export {Header};
