import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import NavLink from "./NavLink"
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";

function NavMain({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const site = useBrowseSite();
    const url = site.data?.site.url;

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavLink
                        icon="TrendingUp"
                        label="Analytics"
                        href="#/analytics"
                    />
                    <NavLink
                        icon="Globe"
                        label="Network"
                        href="#/network"
                    />
                    <NavLink
                        icon="AppWindow"
                        label="View site"
                        href="#/site"
                        className="relative group/viewsite"
                    >
                        <NavLink.After>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="absolute opacity-0 group-hover/viewsite:opacity-100 right-0 top-0 size-9 hover:bg-gray-200 flex items-center justify-center rounded-full text-gray-700 hover:text-black transition-all">
                                <LucideIcon.ExternalLink size={16} />
                            </a>
                        </NavLink.After>
                    </NavLink>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavMain;
