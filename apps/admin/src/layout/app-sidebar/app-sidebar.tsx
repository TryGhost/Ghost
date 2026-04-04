import React from "react"

import {Sidebar} from "@tryghost/shade/components"
import { useFeatureFlag } from "@/hooks/use-feature-flag";

import AppSidebarHeader from "./app-sidebar-header";
import AppSidebarFooter from "./app-sidebar-footer";
import AppSidebarContent from "./app-sidebar-content";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const adminUiRedesign = useFeatureFlag('adminUiRedesign');

    return (
        <Sidebar {...props}>
            <AppSidebarHeader className={adminUiRedesign ? undefined : "px-5 pt-6 pb-0"} />
            <AppSidebarContent />
            <AppSidebarFooter className={adminUiRedesign ? "gap-0 px-3 py-5" : "gap-0 p-3"} />
        </Sidebar>
    )
}

export default AppSidebar;
