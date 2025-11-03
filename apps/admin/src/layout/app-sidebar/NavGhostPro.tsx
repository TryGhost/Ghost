import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import { NavMenuItem } from "./NavMenuItem";

function NavGhostPro({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem>
                        <NavMenuItem.Link href="#/billing">
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
