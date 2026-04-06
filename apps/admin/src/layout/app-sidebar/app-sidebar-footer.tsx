import React, { useState } from "react"

import {SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem} from "@tryghost/shade/components"
import WhatsNewDialog from "@/whats-new/components/whats-new-dialog";
import { UserMenu } from "./user-menu";
import { useSidebarBannerState } from "./hooks/use-sidebar-banner-state";
import { LucideIcon } from "@tryghost/shade/utils";
// import { LucideIcon } from "@tryghost/shade/utils";

function AppSidebarFooter({ ...props }: React.ComponentProps<typeof SidebarFooter>) {
    const [isWhatsNewDialogOpen, setIsWhatsNewDialogOpen] = useState(false);
    const {hasBanner} = useSidebarBannerState();

    return (
        <>
            <SidebarFooter {...props}>
                <div className="mx-2 mb-5 flex flex-col rounded-2xl bg-[#E1F2ED] p-3 text-foreground transition-all hover:scale-[1.033]">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#BFE3D8] text-foreground"><LucideIcon.Gift size={16} /></div>
                    <div className="mt-3 text-md font-semibold">Home assistant</div>
                    <div className="">
                        Connect your Ghost publication to devices in the real world
                    </div>
                </div>
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
