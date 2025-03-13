import * as React from 'react';
import FeedbackBox from './FeedbackBox';
import NewPostModal from '@views/Feed/components/NewPostModal';
import NiceModal from '@ebay/nice-modal-react';
import Recommendations from './Recommendations';
import SidebarMenuLink from './SidebarMenuLink';
import {Button, LucideIcon} from '@tryghost/shade';
import {useFeatureFlags} from '@src/lib/feature-flags';

const Sidebar: React.FC = () => {
    const {allFlags, flags} = useFeatureFlags();

    return (
        <div className='sticky top-[102px] flex min-h-[calc(100vh-102px-32px)] w-[294px] flex-col border-l border-gray-200 dark:border-gray-950'>
            <div className='flex grow flex-col justify-between'>
                <div className='isolate flex w-full flex-col items-start gap-6 pl-4 pt-4'>
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
                    </div>
                    <Button className='h-9 rounded-full bg-purple-500 px-3 text-md text-white dark:hover:bg-purple-500' onClick={() => NiceModal.show(NewPostModal)}>
                        <LucideIcon.FilePen />
                        New note
                    </Button>

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
                <div className='sticky bottom-0 -mb-4 flex items-center gap-2 bg-white pb-4 pl-4'>
                    <FeedbackBox />
                </div>
            </div>
        </div>
    );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
