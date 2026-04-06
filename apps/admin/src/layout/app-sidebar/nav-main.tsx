import React from "react"

import {SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuBadge} from "@tryghost/shade/components"
import {LucideIcon} from "@tryghost/shade/utils"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useBrowseSettings } from "@tryghost/admin-x-framework/api/settings";
import { getSettingValue } from "@tryghost/admin-x-framework/api/settings";
import { hasAdminAccess } from "@tryghost/admin-x-framework/api/users";
import { useNotificationsCountForUser } from "@tryghost/activitypub/src/index";
import NetworkIcon from "./icons/network-icon";
import { NavMenuItem } from "./nav-menu-item";
import { useIsActiveLink } from "./use-is-active-link";

function NavMain({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const { data: settings } = useBrowseSettings();
    const networkEnabled = getSettingValue<boolean>(settings?.settings, 'social_web_enabled') ?? false;


    // The network app has its own notification state, so we don't want to show
    // multiple indicators when you have navigated there.
    const { data: networkNotificationCount = 0 } = useNotificationsCountForUser(currentUser?.slug || '', networkEnabled);
    const isNetworkRouteActive = useIsActiveLink({ path: 'network', activeOnSubpath: true })
    const isActivitypubRouteActive = useIsActiveLink({ path: 'activitypub', activeOnSubpath: true });
    const showNetworkBadge = networkNotificationCount > 0 && !isNetworkRouteActive && !isActivitypubRouteActive;

    // Only show NavMain for admin users
    if (!currentUser || !hasAdminAccess(currentUser)) {
        return null;
    }
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
                    {networkEnabled && (
                        <NavMenuItem>
                            <NavMenuItem.Link to="network" isActive={isNetworkRouteActive || isActivitypubRouteActive}>
                                <NetworkIcon />
                                <NavMenuItem.Label>Network</NavMenuItem.Label>
                            </NavMenuItem.Link>
                            {showNetworkBadge && (
                                <SidebarMenuBadge>{networkNotificationCount}</SidebarMenuBadge>
                            )}
                        </NavMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavMain;
