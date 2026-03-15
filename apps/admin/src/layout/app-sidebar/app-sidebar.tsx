import React from "react"

import {
    Sidebar
} from "@tryghost/shade"

import AppSidebarHeader from "./app-sidebar-header";
import AppSidebarFooter from "./app-sidebar-footer";
import AppSidebarContent from "./app-sidebar-content";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props}>
            <AppSidebarHeader className="px-5 pt-6 pb-0" />
            <AppSidebarContent />
            <AppSidebarFooter className="p-3 gap-0" />
        </Sidebar>
    )
}

export default AppSidebar;
