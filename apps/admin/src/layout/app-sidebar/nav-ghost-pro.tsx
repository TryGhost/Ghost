import React from "react"
import {SidebarGroup, SidebarGroupContent, SidebarMenu} from "@tryghost/shade/components"
import {LucideIcon} from "@tryghost/shade/utils"
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useBrowseConfig } from "@tryghost/admin-x-framework/api/config";
import { isContributorUser, isOwnerUser } from "@tryghost/admin-x-framework/api/users";
import { NavMenuItem } from "./nav-menu-item";
import { useFeatureFlag } from "@/hooks/use-feature-flag";
import { useFeaturebase } from "./hooks/use-featurebase";
import {HideableSidebarItem, RegisterHideableSidebarItem} from "./sidebar-customization";
import {useNavigationItemVisibility} from "./hooks/use-navigation-preferences";

function NavGhostPro({ ...props }: React.ComponentProps<typeof SidebarGroup>) {
    const { data: currentUser } = useCurrentUser();
    const { data: config } = useBrowseConfig();
    const featurebaseFeedbackFlag = useFeatureFlag('featurebaseFeedback');
    const { openFeedbackWidget, preloadFeedbackWidget } = useFeaturebase();
    const showFeedbackItem = useNavigationItemVisibility('feedback');

    if (!currentUser) {
        return null;
    }

    const isProSite = config?.config.hostSettings?.billing?.enabled;
    const showGhostPro = isProSite && isOwnerUser(currentUser);
    const showFeedback = featurebaseFeedbackFlag && !isContributorUser(currentUser) && config?.config.featurebase?.enabled;

    if (!showGhostPro && !showFeedback) {
        return null;
    }

    if (!showGhostPro && showFeedback && !showFeedbackItem) {
        return <RegisterHideableSidebarItem id="feedback" label="Feedback" />;
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
                        <HideableSidebarItem id="feedback" label="Feedback">
                            <NavMenuItem>
                                <NavMenuItem.Button onClick={openFeedbackWidget} onMouseEnter={preloadFeedbackWidget} onFocus={preloadFeedbackWidget}>
                                    <LucideIcon.MessageCircle />
                                    <NavMenuItem.Label>Feedback</NavMenuItem.Label>
                                </NavMenuItem.Button>
                            </NavMenuItem>
                        </HideableSidebarItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default NavGhostPro;
