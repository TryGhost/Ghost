import React, { useState } from "react"

import {
    SidebarFooter,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem
} from "@tryghost/shade"
import UserMenu from "./UserMenu";
import WhatsNewDialog from "@/whats-new/components/whats-new-dialog";

function AppSidebarFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    const [isWhatsNewDialogOpen, setIsWhatsNewDialogOpen] = useState(false);
    return (
        <>
            <SidebarFooter {...props}>
                <SidebarGroup>
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
