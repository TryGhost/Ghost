import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { isOwnerUser } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./NavMenuItem";

function NavGhostPro({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const { data: config } = useBrowseConfig();

    // Only show Ghost(Pro) for owner users when billing is enabled
    if (!currentUser || !isOwnerUser(currentUser) || !config?.config.hostSettings?.billing?.enabled) {
        return null;
    }

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem>
                        <NavMenuItem.Link to="pro">
                            <LucideIcon.CreditCard />
                            <NavMenuItem.Label>Ghost(Pro)</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavGhostPro;
