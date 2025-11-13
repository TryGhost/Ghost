import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/currentUser";
import { useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { getSettingValue } from "@tryghost/admin-x-framework/api/settings";
import { hasAdminAccess } from "@tryghost/admin-x-framework/api/users";
import NetworkIcon from "./icons/NetworkIcon";
import { NavMenuItem } from "./NavMenuItem";

function NavMain({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const { data: settings } = useBrowseSettings();
    const site = useBrowseSite();
    const url = site.data?.site.url;

    // Only show NavMain for admin users
    if (!currentUser || !hasAdminAccess(currentUser)) {
        return null;
    }

    const socialWebEnabled = getSettingValue<boolean>(settings?.settings, 'social_web_enabled');

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem>
                        <NavMenuItem.Link to="analytics" activeOnSubpath>
                            <LucideIcon.TrendingUp />
                            <NavMenuItem.Label>Analytics</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>
                    {socialWebEnabled && (
                        <NavMenuItem>
                            <NavMenuItem.Link to="network">
                                <NetworkIcon />
                                <NavMenuItem.Label>Network</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}
                    <NavMenuItem className="relative group/viewsite">
                        <NavMenuItem.Link to="site">
                            <LucideIcon.AppWindow />
                            <NavMenuItem.Label>View site</NavMenuItem.Label>
                        </NavMenuItem.Link>
                        <a
                            href={url}
                            target="_blank"
                            aria-label="View site in new tab"
                            rel="noopener noreferrer"
                            className="absolute opacity-0 group-hover/viewsite:opacity-100 right-0 top-0 size-8 hover:bg-sidebar-accent flex items-center justify-center rounded-full text-gray-700 hover:text-sidebar-accent-foreground transition-all">
                                <LucideIcon.ExternalLink size={16} />
                        </a>
                    </NavMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavMain;
