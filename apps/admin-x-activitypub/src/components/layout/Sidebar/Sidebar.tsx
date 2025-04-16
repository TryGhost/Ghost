import * as React from 'react';
import FeedbackBox from './FeedbackBox';
import NewNoteModal from '@src/components/modals/NewNoteModal';
import Recommendations from './Recommendations';
import Search from '@src/components/modals/Search';
import SearchInput from '../Header/SearchInput';
import SidebarMenuLink from './SidebarMenuLink';
import {Button, Dialog, DialogContent, DialogTrigger, LucideIcon} from '@tryghost/shade';
import {useFeatureFlags} from '@src/lib/feature-flags';

const Sidebar: React.FC = () => {
    const {allFlags, flags, isEnabled} = useFeatureFlags();
    const [isSearchOpen, setIsSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    return (
        <div className='sticky top-0 flex min-h-screen w-[320px] flex-col border-l border-gray-200 pr-8 dark:border-gray-950'>
            <div className='flex grow flex-col justify-between'>
                <div className='isolate flex w-full flex-col items-start gap-6 pl-6 pt-6'>
                    <div className='flex h-[52px] w-full items-center'>
                        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
                            <DialogTrigger className='w-full'>
                                <SearchInput />
                            </DialogTrigger>
                            <DialogContent>
                                <Search query={searchQuery} setQuery={setSearchQuery} onOpenChange={setIsSearchOpen} />
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className='flex w-full flex-col gap-px'>
                        <SidebarMenuLink to='/inbox'>
                            <LucideIcon.Inbox size={18} strokeWidth={1.5} />
                            Inbox
                        </SidebarMenuLink>
                        <SidebarMenuLink to='/feed'>
                            <LucideIcon.Hash size={18} strokeWidth={1.5} />
                            Feed
                        </SidebarMenuLink>
                        <SidebarMenuLink to='/notifications'>
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
                        {isEnabled('settings') &&
                            <SidebarMenuLink to='/preferences'>
                                <LucideIcon.Settings2 size={18} strokeWidth={1.5} />
                                Preferences
                            </SidebarMenuLink>
                        }
                    </div>
                    <NewNoteModal>
                        <Button className='h-9 rounded-full bg-purple-500 px-3 text-md text-white dark:hover:bg-purple-500'>
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
