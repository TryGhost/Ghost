import React from "react"

import {
    SidebarFooter,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem
} from "@tryghost/shade"
import UserMenu from "./UserMenu";

function AppSidebarFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    return (
        <SidebarFooter {...props}>
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

export default AppSidebarFooter;
