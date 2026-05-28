import React from "react"

import {Sidebar} from "@tryghost/shade/components"

import AppSidebarHeader from "./app-sidebar-header";
import AppSidebarFooter from "./app-sidebar-footer";
import AppSidebarContent from "./app-sidebar-content";
import {SidebarCustomizationProvider} from "./sidebar-customization";
import {useSidebarCustomizationContext} from "./sidebar-customization-context";

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <SidebarCustomizationProvider>
            <AppSidebarInner {...props} />
        </SidebarCustomizationProvider>
    )
}

function AppSidebarInner({onContextMenu, ...props}: React.ComponentProps<typeof Sidebar>) {
    const {openContextMenu} = useSidebarCustomizationContext();

    return (
        <Sidebar
            {...props}
            onContextMenu={(event) => {
                onContextMenu?.(event);

                if (!event.defaultPrevented) {
                    openContextMenu(event);
                }
            }}
        >
            <AppSidebarHeader className="px-5 pt-6 pb-0" />
            <AppSidebarContent />
            <AppSidebarFooter className="gap-0 p-3" />
        </Sidebar>
    )
}

export default AppSidebar;
