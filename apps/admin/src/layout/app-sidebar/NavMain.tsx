import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import NetworkIcon from "./icons/NetworkIcon";
import { NavMenuItem } from "./NavMenuItem";

function NavMain({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const site = useBrowseSite();
    const url = site.data?.site.url;

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    <NavMenuItem>
                        <NavMenuItem.Link href="#/analytics" activeOnSubpath>
                            <LucideIcon.TrendingUp />
                            <NavMenuItem.Label>Analytics</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>
                    <NavMenuItem>
                        <NavMenuItem.Link href="#/network">
                            <NetworkIcon />
                            <NavMenuItem.Label>Network</NavMenuItem.Label>
                        </NavMenuItem.Link>
                    </NavMenuItem>
                    <NavMenuItem className="relative group/viewsite">
                        <NavMenuItem.Link href="#/site">
                            <LucideIcon.AppWindow />
                            <NavMenuItem.Label>View site</NavMenuItem.Label>
                        </NavMenuItem.Link>
                        <a
                            href={url}
                            target="_blank"
                            aria-label="View site in new tab"
                            rel="noopener noreferrer"
                            className="absolute opacity-0 group-hover/viewsite:opacity-100 right-0 top-0 size-8 hover:bg-gray-200 flex items-center justify-center rounded-full text-gray-700 hover:text-black transition-all">
                                <LucideIcon.ExternalLink size={16} />
                        </a>
                    </NavMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavMain;
