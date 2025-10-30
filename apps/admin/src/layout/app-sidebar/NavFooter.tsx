import React from "react"

import {
    LucideIcon,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@tryghost/shade"
import UserMenu from "./UserMenu";

function NavFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    return (
        <SidebarFooter {...props}>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <a href='#/settings'>
                                    <LucideIcon.Settings />
                                    <span>Settings</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <a href="https://ghost.org/help?utm_source=admin&utm_campaign=help" target="_blank" rel="noopener noreferrer">
                                    <LucideIcon.HelpCircle />
                                    <span>Help</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <UserMenu />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </SidebarFooter>
    );
}

export default NavFooter;
