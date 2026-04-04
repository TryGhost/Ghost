import React from "react"

import {Sidebar} from "@tryghost/shade/components"

import AppSidebarHeader from "./app-sidebar-header";
import AppSidebarFooter from "./app-sidebar-footer";
import AppSidebarContent from "./app-sidebar-content";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
            <AppSidebarHeader />
            <AppSidebarContent />
            <AppSidebarFooter className="gap-0 p-3" />
        </Sidebar>
    )
}

export default AppSidebar;
