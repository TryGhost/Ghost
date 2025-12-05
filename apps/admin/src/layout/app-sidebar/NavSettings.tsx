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

                    <NavMenuItem className="relative group/help">
                        <NavMenuItem.Link to="help">
                            <LucideIcon.HelpCircle />
                            <NavMenuItem.Label>Help</NavMenuItem.Label>
                        </NavMenuItem.Link>
                        <a
                            href="https://ghost.org/help?utm_source=admin&utm_campaign=help"
                            target="_blank"
                            aria-label="Open help in new tab"
                            rel="noopener noreferrer"
                            className="absolute opacity-0 group-hover/help:opacity-100 right-0 top-0 size-8 hover:bg-sidebar-accent flex items-center justify-center rounded-full text-gray-700 hover:text-sidebar-accent-foreground transition-all"
                        >
                            <LucideIcon.ExternalLink size={16} />
                        </a>
                    </NavMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavSettings;
