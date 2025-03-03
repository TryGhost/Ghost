import React from 'react';
import Search from '@components/dialogs/Search';
import SearchInput from './SearchInput';
import useActiveRoute from '@src/hooks/use-active-route';
import {Button, Dialog, DialogContent, DialogTrigger, H1, LucideIcon} from '@tryghost/shade';
import {useLocation, useNavigate, useNavigationStack} from '@tryghost/admin-x-framework';

interface HeaderTitleProps {
    title: string;
    backIcon: boolean;
}

const HeaderTitle: React.FC<HeaderTitleProps> = ({title, backIcon}) => {
    const navigate = useNavigate();
    const {previousPath} = useNavigationStack();

    if (backIcon) {
        return (
            <Button className='-ml-2 h-9 w-auto px-2 dark:text-white [&_svg]:size-6' variant='ghost' onClick={() => {
                if (previousPath) {
                    navigate(-1);
                } else {
                    navigate('/');
                }
            }}>
                <LucideIcon.ArrowLeft size={24} strokeWidth={1} />
            </Button>
        );
    }
    return (
        <H1>{title}</H1>
    );
};

const Header: React.FC = () => {
    const location = useLocation();
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    // Get page title from custom route object
    const activeRoute = useActiveRoute();

    return (
        <div
            className='sticky top-0 z-10 bg-white px-8 dark:bg-black'>
            <div className='flex h-[102px] items-center justify-between gap-5 border-b border-gray-200 dark:border-gray-950'>
                <HeaderTitle backIcon={location.pathname === '/search'} title={activeRoute?.pageTitle || ''} />
                <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                    <DialogTrigger>
                        <SearchInput />
                    </DialogTrigger>
                    <DialogContent>
                        <Search query={searchQuery} setQuery={setSearchQuery} onOpenChange={setIsSearchOpen} />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default Header;
