import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@tryghost/shade"

function NavMain({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <a href="#/analytics">
                                <LucideIcon.TrendingUp />
                                <span>Analytics</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <a href="#/network">
                                <LucideIcon.Globe />
                                <span>Network</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem className="relative group/viewsite">
                        <SidebarMenuButton asChild>
                            <a href="#/site">
                                <LucideIcon.AppWindow />
                                <span>View site</span>
                            </a>
                        </SidebarMenuButton>
                        <a href="https://example.com" className="absolute opacity-0 group-hover/viewsite:opacity-100 right-0 top-0 size-9 hover:bg-gray-200 flex items-center justify-center rounded-full text-gray-700 hover:text-black transition-all">
                            <LucideIcon.ExternalLink size={16} />
                        </a>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavMain;
