// The main Email stats component that encapsulates the breakdown
import {Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarSeparator} from '@tryghost/shade';
import SentStats from './SentStats';
import {useState} from 'react';
import OpenedStats from './OpenedStats';

type TabType = 'sent' | 'opened' | 'clicked' | 'unsubscribed' | 'feedback' | 'spam' | 'bounced';

const EmailStats = () => {
    const [activeTab, setActiveTab] = useState<TabType>('sent');

    const renderContent = () => {
        switch (activeTab) {
        case 'sent':
            return <SentStats />;
        default:
            return <OpenedStats />;
        }
    };

    return (
        <div className="grid w-full grid-cols-5">
            <div className="col-span-4 pr-10">
                {renderContent()}
            </div>
            <Sidebar className="w-full bg-transparent pl-3" collapsible="none">
                <SidebarContent>
                    <SidebarGroup className="border-b px-0 last:border-none">
                        <SidebarGroupContent className="gap-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={activeTab === 'sent'}
                                        onClick={() => setActiveTab('sent')}
                                    >
                                        <span>Sent</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>6,197</SidebarMenuBadge>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={activeTab === 'opened'}
                                        onClick={() => setActiveTab('opened')}
                                    >
                                        <span>Opened</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>1,004</SidebarMenuBadge>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton>
                                        <span>Clicked</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>348</SidebarMenuBadge>
                                </SidebarMenuItem>

                                <SidebarSeparator />

                                <SidebarMenuItem>
                                    <SidebarMenuButton>
                                        <span>Unsubscribed</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>29</SidebarMenuBadge>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton>
                                        <span>Marked as spam</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>85</SidebarMenuBadge>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton>
                                        <span>Bounced</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>163</SidebarMenuBadge>
                                </SidebarMenuItem>

                                <SidebarSeparator />

                                <SidebarMenuItem>
                                    <SidebarMenuButton>
                                        <span>Links</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>5</SidebarMenuBadge>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton>
                                        <span>Feedback</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuBadge>411</SidebarMenuBadge>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </div>
    );
};

export default EmailStats;