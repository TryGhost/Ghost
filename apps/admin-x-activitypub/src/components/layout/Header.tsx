import * as React from 'react';
import {Button, H1, LucideIcon} from '@tryghost/shade';
import {ROUTE_TITLES} from '@src/routes';
import {useLocation, useNavigate} from '@tryghost/admin-x-framework';

interface HeaderTitleProps {
    title: string;
    backIcon: boolean;
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({title, backIcon}) => {
    const navigate = useNavigate();

    if (backIcon) {
        return (
            <Button className='-ml-2 h-9 w-auto px-2 dark:text-white [&_svg]:size-6' variant='ghost' onClick={() => {
                navigate('/');
            }}><LucideIcon.ArrowLeft size={24} strokeWidth={1} /></Button>
        );
    }
    return (
        <H1>{title}</H1>
    );
};

const Header: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Get page title from custom route object
    const title = ROUTE_TITLES[location.pathname] || 'Inbox';

    return (
        <div
            className='sticky top-0 z-10 bg-white px-8 dark:bg-black'>
            <div className='flex h-[102px] items-center justify-between gap-5 border-b border-gray-200 dark:border-gray-950'>
                <HeaderTitle backIcon={location.pathname === '/search'} title={title} />
                <Button className='h-9 w-[274px] justify-start rounded-full bg-gray-100 text-md font-normal text-gray-600 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-925 dark:text-gray-700 dark:hover:bg-gray-950 [&_svg]:size-[18px]' variant='ghost' onClick={() => navigate('/search')}>
                    <LucideIcon.Search size={18} strokeWidth={1.5} />
                    Search
                </Button>
            </div>
        </div>
    );
};

Header.displayName = 'Header';

export {Header};
