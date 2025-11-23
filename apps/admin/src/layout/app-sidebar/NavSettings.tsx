import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { canAccessSettings } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./NavMenuItem";

function NavSettings({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const showSettings = currentUser && canAccessSettings(currentUser);

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {showSettings && (
                        <NavMenuItem>
                            <NavMenuItem.Link to="settings">
                                <LucideIcon.Settings />
                                <NavMenuItem.Label>Settings</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}

                    <NavMenuItem>
                        <NavMenuItem.Link
                            to="https://ghost.org/help?utm_source=admin&utm_campaign=help"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <LucideIcon.HelpCircle />
                            <NavMenuItem.Label>Help</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavSettings;
