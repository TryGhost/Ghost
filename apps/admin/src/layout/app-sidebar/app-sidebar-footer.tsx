import React, { useState } from "react"

import {
    SidebarFooter,
    SidebarGroup,
    SidebarMenu,
    SidebarMenuItem
} from "@tryghost/shade"
import WhatsNewDialog from "@/whats-new/components/whats-new-dialog";
import { UserMenu } from "./user-menu";
import { useUpgradeStatus } from "./hooks/use-upgrade-status";
import { useWhatsNewStatus } from "./hooks/use-whats-new-status";

function AppSidebarFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    const [isWhatsNewDialogOpen, setIsWhatsNewDialogOpen] = useState(false);
    const { showUpgradeBanner } = useUpgradeStatus();
    const { showWhatsNewBanner } = useWhatsNewStatus();
    const banner = showUpgradeBanner || showWhatsNewBanner;

    return (
        <>
            <SidebarFooter {...props}>
                <SidebarGroup className={`${banner && 'pt-3'}`}>
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
