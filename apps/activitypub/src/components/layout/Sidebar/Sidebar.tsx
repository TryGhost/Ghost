import * as React from 'react';
import FeedbackBox from './FeedbackBox';
import NewNoteModal from '@src/components/modals/NewNoteModal';
import Recommendations from './Recommendations';
import Search from '@src/components/modals/Search';
import SearchInput from '../Header/SearchInput';
import SidebarMenuLink from './SidebarMenuLink';
import {Button, Dialog, DialogContent, DialogTrigger, LucideIcon} from '@tryghost/shade';
import {useAppBasePath} from '@src/hooks/use-app-base-path';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/currentUser';
import {useFeatureFlags} from '@src/lib/feature-flags';
import {useLocation} from '@tryghost/admin-x-framework';
import {useNotificationsCountForUser, useResetNotificationsCountForUser} from '@src/hooks/use-activity-pub-queries';

interface SidebarProps {
    isMobileSidebarOpen: boolean;
    onCloseMobileSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({isMobileSidebarOpen}) => {
    const {allFlags, flags} = useFeatureFlags();
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const {data: currentUser} = useCurrentUser();
    const location = useLocation();
    const basePath = useAppBasePath();
    const {data: notificationsCount} = useNotificationsCountForUser(currentUser?.slug || '');
    const resetNotificationsCount = useResetNotificationsCountForUser(currentUser?.slug || '');

    // Reset count when on notifications page
    React.useEffect(() => {
        if (location.pathname === `${basePath}/notifications` && notificationsCount && notificationsCount > 0) {
            resetNotificationsCount.mutate();
        }
    }, [location.pathname, basePath, notificationsCount, resetNotificationsCount]);

    const handleNotificationsClick = React.useCallback(() => {
        if (notificationsCount && notificationsCount > 0) {
            resetNotificationsCount.mutate();
        }
    }, [notificationsCount, resetNotificationsCount]);

    return (
        <div className={`sticky top-0 flex min-h-screen w-[320px] flex-col border-l border-gray-200 pr-8 transition-transform duration-300 ease-in-out max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-50 max-lg:border-0 max-lg:bg-white max-lg:shadow-xl max-md:bottom-[72px] max-md:min-h-[auto] max-md:overflow-y-scroll dark:border-gray-950 max-lg:dark:bg-black ${
            isMobileSidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:translate-x-full'
        }`}>
            <div className='flex grow flex-col justify-between'>
                <div className='isolate flex w-full flex-col items-start gap-6 pl-6 pt-6'>
                    <div className='flex h-[52px] w-full items-center'>
                        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                            <DialogTrigger className='mt-0.5 w-full'>
                                <SearchInput />
                            </DialogTrigger>
                            <DialogContent>
                                <Search query={searchQuery} setQuery={setSearchQuery} onOpenChange={setIsSearchOpen} />
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className='flex w-full flex-col gap-px'>
                        <SidebarMenuLink to='/reader'>
                            <LucideIcon.BookOpen size={18} strokeWidth={1.5} />
                            Reader
                        </SidebarMenuLink>
                        <SidebarMenuLink to='/notes'>
                            <LucideIcon.MessageCircle size={18} strokeWidth={1.5} />
                            Notes
                        </SidebarMenuLink>
                        <SidebarMenuLink
                            count={location.pathname !== `${basePath}/notifications` ? notificationsCount : undefined}
                            to='/notifications'
                            onClick={handleNotificationsClick}
                        >
                            <LucideIcon.Bell size={18} strokeWidth={1.5} />
                            Notifications
                        </SidebarMenuLink>
                        <SidebarMenuLink to='/explore'>
                            <LucideIcon.Globe size={18} strokeWidth={1.5} />
                            Explore
                        </SidebarMenuLink>
                        <SidebarMenuLink to='/profile'>
                            <LucideIcon.User size={18} strokeWidth={1.5} />
                            Profile
                        </SidebarMenuLink>
                        <SidebarMenuLink to='/preferences'>
                            <LucideIcon.Settings2 size={18} strokeWidth={1.5} />
                            Preferences
                        </SidebarMenuLink>
                    </div>
                    <NewNoteModal>
                        <Button className='h-9 rounded-full bg-purple-500 px-3 text-md text-white hover:bg-purple-600 dark:hover:bg-purple-600'>
                            <LucideIcon.FilePen />
                            New note
                        </Button>
                    </NewNoteModal>

                    <Recommendations />

                    {allFlags.map((flag) => {
                        if (flags[flag]) {
                            return (
                                <div key={flag} className="flex items-center justify-between gap-1 pl-3 opacity-50">
                                    <span className="font-mono text-xs">{flag}</span>
                                    <span className='text-green-800 inline-flex items-center rounded bg-green-100 px-1 py-0.5 text-xs font-medium'>
                                            ON
                                    </span>
                                </div>
                            );
                        }
                        return (<></>);
                    })}
                </div>
                <div className='sticky bottom-0 flex items-center gap-2 bg-white pb-4 pl-4 dark:bg-black'>
                    <FeedbackBox />
                </div>
            </div>
        </div>
    );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
