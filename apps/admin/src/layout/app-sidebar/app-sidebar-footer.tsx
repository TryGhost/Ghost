import React, { useState } from "react"

import {SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem} from "@tryghost/shade/components"
import WhatsNewDialog from "@/whats-new/components/whats-new-dialog";
import { UserMenu } from "./user-menu";
import { useSidebarBannerState } from "./hooks/use-sidebar-banner-state";
// import { LucideIcon } from "@tryghost/shade/utils";

function AppSidebarFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    const [isWhatsNewDialogOpen, setIsWhatsNewDialogOpen] = useState(false);
    const {hasBanner} = useSidebarBannerState();

    return (
        <>
            <SidebarFooter {...props}>
                {/* <div className="mx-2 mb-8 flex flex-col gap-1 rounded-2xl bg-[#E1F2ED] p-5 text-foreground">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#BFE3D8] text-foreground"><LucideIcon.Gift /></div>
                    <div className="mt-2 font-semibold">Home assistant</div>
                    <div>
                        Connect your Ghost publication to devices in the real world
                    </div>
                </div> */}
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
