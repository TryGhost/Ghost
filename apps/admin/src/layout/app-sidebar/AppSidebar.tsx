import React from "react"

import {
    Button,
    LucideIcon,
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader
} from "@tryghost/shade"

import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import NavMain from "./NavMain";
import NavContent from "./NavContent";
import NavGhostPro from "./NavGhostPro";
import UserMenu from "./UserMenu";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const site = useBrowseSite();
    const title = site.data?.site.title ?? "Loading...";
    const logo = site.data?.site.logo ?? "https://static.ghost.org/v4.0.0/images/ghost-orb-1.png";

    return (
        <Sidebar {...props}>

            <SidebarHeader>
                <div className="px-4 pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-transparent border-0 flex-shrink-0">
                            <img
                                src={logo}
                                alt="Site icon"
                                className="w-full h-full rounded-md object-cover"
                            />
                        </div>
                        <div className="font-semibold text-[15px] text-black overflow-hidden text-ellipsis whitespace-nowrap">
                            {title}
                        </div>
                    </div>
                    <Button
                        variant='ghost'
                        size='icon'
                        className="size-9 text-gray-800 rounded-full hover:bg-gray-200 -mr-1"
                        title="Search site (Ctrl/⌘ + K)"
                    >
                        <LucideIcon.Search size={20} />
                    </Button>
                </div>
            </SidebarHeader>


            <SidebarContent className="p-3 gap-4">
                <NavMain />
                <NavContent />
                <NavGhostPro />
            </SidebarContent>

            <SidebarFooter className="border-t-0 mt-auto">
                <div className="px-2 py-5 flex items-center justify-between">
                    <UserMenu />
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 hover:bg-gray-200 rounded-full p-0 text-gray-800"
                            title="Settings (CTRL/⌘ + ,)"
                            asChild
                        >
                            <a href="#/settings" >
                                <LucideIcon.Settings size={20} />
                            </a>
                        </Button>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

export default AppSidebar;
