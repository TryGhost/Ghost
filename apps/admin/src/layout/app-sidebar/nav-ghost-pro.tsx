import React from "react"

import {
    LucideIcon,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu
} from "@tryghost/shade"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { isContributorUser, isOwnerUser } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./nav-menu-item";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { useFeaturebase } from "@/hooks/use-featurebase";

function NavGhostPro({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const { data: config } = useBrowseConfig();
    const featurebaseFeedbackFlag = useFeatureFlag('featurebaseFeedback');
    const { openFeedbackWidget } = useFeaturebase();

    const isProSite = config?.config.hostSettings?.billing?.enabled;

    if (!currentUser || !isProSite) {
        return null;
    }

    // Only show Ghost(Pro) for owner users when billing is enabled
    const showGhostPro = isOwnerUser(currentUser) && config?.config.hostSettings?.billing?.enabled;
    const showFeedback = featurebaseFeedbackFlag && !isContributorUser(currentUser) && config?.config.featurebase?.enabled;

    if (!showGhostPro && !showFeedback) {
        return null;
    }

    return (
        <SidebarGroup {...props}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {showGhostPro && (
                        <NavMenuItem>
                            <NavMenuItem.Link to="pro">
                                <LucideIcon.CreditCard />
                                <NavMenuItem.Label>Ghost(Pro)</NavMenuItem.Label>
                            </NavMenuItem.Link>
                        </NavMenuItem>
                    )}
                    {showFeedback && (
                        <NavMenuItem>
                            <NavMenuItem.Button onClick={openFeedbackWidget}>
                                <LucideIcon.MessageCircle />
                                <NavMenuItem.Label>Feedback</NavMenuItem.Label>
                            </NavMenuItem.Button>
                        </NavMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavGhostPro;
