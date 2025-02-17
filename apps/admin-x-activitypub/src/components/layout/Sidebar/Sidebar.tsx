import * as React from 'react';
import Recommendations from './Recommendations';
import SidebarButton from './SidebarButton';
import {Button, LucideIcon, Separator, cn} from '@tryghost/shade';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface SidebarProps {
    route: string;
}

const Sidebar: React.FC<SidebarProps> = ({route}) => {
    const {updateRoute} = useRouting();

    return (
        <div
            className={cn(
                'border-l border-gray-200 fixed top-[102px] right-8 w-[294px] min-h-[calc(100vh-102px-32px)]',
                'pointer-events-none',
                '[&>*]:pointer-events-auto'
            )}
        >
            <div className='flex w-full flex-col items-start gap-8 pl-4 pt-4'>
                <div className='flex w-full flex-col gap-px'>
                    <SidebarButton active={route === 'inbox'} onClick={() => updateRoute('inbox')}>
                        <LucideIcon.Inbox size={18} strokeWidth={1.5} />
                            Inbox
                    </SidebarButton>
                    <SidebarButton active={route === 'feed'} onClick={() => updateRoute('feed')}>
                        <LucideIcon.Hash size={18} strokeWidth={1.5} />
                            Feed
                    </SidebarButton>
                    <SidebarButton active={route === 'notifications'} onClick={() => updateRoute('notifications')}>
                        <LucideIcon.Bell size={18} strokeWidth={1.5} />
                            Notifications
                    </SidebarButton>
                    <SidebarButton active={route === 'profile'} onClick={() => updateRoute('profile')}>
                        <LucideIcon.User size={18} strokeWidth={1.5} />
                            Profile
                    </SidebarButton>
                </div>
                <Button className='rounded-full bg-purple-500' onClick={() => updateRoute('feed')}>
                    <LucideIcon.FilePen />
                    New note
                </Button>

                <Separator />

                <Recommendations />
            </div>
        </div>
    );
};

Sidebar.displayName = 'Sidebar';

export default Sidebar;
