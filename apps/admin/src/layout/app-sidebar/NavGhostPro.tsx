import React from "react"

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import NavLink from "./NavLink"

function NavGhostPro({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavLink
                        icon="CreditCard"
                        label="Ghost(Pro)"
                        href="#/billing"
                    />
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavGhostPro;
