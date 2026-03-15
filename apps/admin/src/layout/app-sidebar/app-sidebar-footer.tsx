import React, { useState } from "react"

import {
    SidebarFooter,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem
} from "@tryghost/shade"
import WhatsNewDialog from "@/whats-new/components/whats-new-dialog";
import { UserMenu } from "./user-menu";
import { useSidebarBannerState } from "./hooks/use-sidebar-banner-state";

function AppSidebarFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    const [isWhatsNewDialogOpen, setIsWhatsNewDialogOpen] = useState(false);
    const {hasBanner} = useSidebarBannerState();

    return (
        <>
            <SidebarFooter {...props}>
                <SidebarGroup className={hasBanner ? 'pt-3' : ''}>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <UserMenu onOpenWhatsNew={() => setIsWhatsNewDialogOpen(true)} />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarFooter>
            <WhatsNewDialog
                open={isWhatsNewDialogOpen}
                onOpenChange={setIsWhatsNewDialogOpen}
            />
        </>
    );
}

export default AppSidebarFooter;
