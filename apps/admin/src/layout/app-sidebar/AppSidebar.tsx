import React from "react"

import {
    Button,
    LucideIcon,
    Sidebar,
    SidebarContent,
    SidebarFooter
} from "@tryghost/shade"

import NavMain from "./NavMain";
import NavContent from "./NavContent";
import NavGhostPro from "./NavGhostPro";
import UserMenu from "./UserMenu";
import NavHeader from "./NavHeader";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>

            <NavHeader />

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
                            className="size-9 hover:bg-gray-200 rounded-full p-0 text-gray-800 [&_svg]:size-auto"
                            title="Settings (CTRL/⌘ + ,)"
                            asChild
                        >
                            <a href="#/settings" >
                                <LucideIcon.Settings size={20} />
                            </a>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 hover:bg-gray-200 rounded-full p-0 text-gray-800 [&_svg]:size-auto"
                            title="Toggle theme"
                        >
                            <LucideIcon.Moon size={20} />
                        </Button>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

export default AppSidebar;
