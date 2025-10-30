import React from "react"

import {
    Sidebar,
    SidebarContent,
} from "@tryghost/shade"

import NavMain from "./NavMain";
import NavContent from "./NavContent";
import NavGhostPro from "./NavGhostPro";
import NavHeader from "./NavHeader";
import NavFooter from "./NavFooter";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
            <NavHeader className="px-5 pt-6 pb-0" />
            <SidebarContent className="px-3 pt-4">
                <NavMain />
                <NavContent />
                <NavGhostPro />
            </SidebarContent>
            <NavFooter className="p-3 gap-0" />
        </Sidebar>
    )
}

export default AppSidebar;
