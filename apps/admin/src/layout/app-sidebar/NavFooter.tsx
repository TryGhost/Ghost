import React from "react"

import {
    LucideIcon,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem
} from "@tryghost/shade"
import UserMenu from "./UserMenu";
import { NavMenuItem } from "./NavMenuItem";

function NavFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    return (
        <SidebarFooter {...props}>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <NavMenuItem>
                            <NavMenuItem.Link href="#/settings">
                                <LucideIcon.Settings />
                                <NavMenuItem.Label>Settings</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>

                        <NavMenuItem>
                            <NavMenuItem.Link
                                href="https://ghost.org/help?utm_source=admin&utm_campaign=help"
                                target="_blank"
                            >
                                <LucideIcon.HelpCircle />
                                <NavMenuItem.Label>Help</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
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
