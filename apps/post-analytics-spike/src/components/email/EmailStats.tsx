// The main Email stats component that encapsulates the breakdown
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@tryghost/shade";

const EmailStats = () => {
    return (
        <div className="w-full grid grid-cols-5">
        <div className="col-span-4">
            This uses a `sidebar` component which is nicer but not as straightforward to use as tabs
        </div>
        <Sidebar collapsible="none" className="bg-transparent w-full">
            <SidebarContent>
                <SidebarGroup className="border-b last:border-none">
                    <SidebarGroupContent className="gap-0">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton isActive>
                                    <span>Sent</span>
                                </SidebarMenuButton>
                                <SidebarMenuButton>
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