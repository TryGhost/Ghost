// The main Email stats component that encapsulates the breakdown
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@tryghost/shade";
import SentStats from "./SentStats";
import { useState } from "react";
import OpenedStats from "./OpenedStats";

type TabType = 'sent' | 'opened' | 'clicked' | 'unsubscribed' | 'feedback' | 'spam' | 'bounced';

const EmailStats = () => {
    const [activeTab, setActiveTab] = useState<TabType>('sent');

    const renderContent = () => {
        switch (activeTab) {
            case 'sent':
                return <SentStats />
            default:
                return <OpenedStats />
        }
    }

    return (
        <div className="w-full grid grid-cols-5">
            <div className="col-span-4">
                {renderContent()}
            </div>
            <Sidebar collapsible="none" className="bg-transparent w-full">
                <SidebarContent>
                    <SidebarGroup className="border-b last:border-none">
                        <SidebarGroupContent className="gap-0">
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={activeTab === 'sent'}
                                        onClick={() => setActiveTab('sent')}
                                    >
                                        <span>Sent</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton
                                        isActive={activeTab === 'opened'}
                                        onClick={() => setActiveTab('opened')}
                                    >
                                        <span>Opened</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Clicked</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Unsubscribed</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Feedback</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Marked as spam</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuButton>
                                        <span>Bounced</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </div>
    );
}

export default EmailStats;