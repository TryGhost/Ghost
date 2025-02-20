import * as React from 'react';
import NewPostModal from '@views/Feed/components/NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import Recommendations from './Recommendations';
import SidebarButton from './SidebarButton';
import {Button, LucideIcon, Separator} from '@tryghost/shade';
import {useNavigate} from '@tryghost/admin-x-framework';

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className='sticky top-[102px] flex min-h-[calc(100vh-102px-32px)] w-[294px] flex-col border-l border-gray-200 dark:border-gray-950'>
            <div className='flex grow flex-col justify-between'>
                <div className='flex w-full flex-col items-start gap-8 pl-4 pt-4'>
                    <div className='flex w-full flex-col gap-px'>
                        <SidebarButton route='/inbox'>
                            <LucideIcon.Inbox size={18} strokeWidth={1.5} />
                            Inbox
                        </SidebarButton>
                        <SidebarButton route='/feed'>
                            <LucideIcon.Hash size={18} strokeWidth={1.5} />
                            Feed
                        </SidebarButton>
                        <SidebarButton route='/notifications'>
                            <LucideIcon.Bell size={18} strokeWidth={1.5} />
                            Notifications
                        </SidebarButton>
                        <SidebarButton route='/profile'>
                            <LucideIcon.User size={18} strokeWidth={1.5} />
                            Profile
                        </SidebarButton>
                    </div>
                    <Button className='h-9 rounded-full bg-purple-500 px-3 text-md text-white dark:hover:bg-purple-500' onClick={() => NiceModal.show(NewPostModal)}>
                        <LucideIcon.FilePen />
                        New note
                    </Button>

                    <Separator />

                    <Recommendations />
                </div>
                <div className='flex items-center gap-2 pl-7 pt-4 text-xs text-gray-400'>
                    <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://forum.ghost.org/t/activitypub-beta-start-here/51780" rel="noreferrer" target="_blank">Feedback</a>
                    &sdot;
                    <a className='text-xs font-medium text-gray-700 hover:text-black dark:text-gray-800 dark:hover:text-white' href="https://activitypub.ghost.org/archive" rel="noreferrer"target="_blank">Updates</a>
                </div>
            </div>
        </div>
    );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
