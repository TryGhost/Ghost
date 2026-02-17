import {
    SidebarContent,
} from "@tryghost/shade"

import WhatsNewBanner from "@/whats-new/components/whats-new-banner";

import NavMain from "./nav-main";
import NavContent from "./nav-content";
import NavGhostPro from "./nav-ghost-pro";
import NavSettings from "./nav-settings";
import ThemeErrorsBanner from "./theme-errors-banner";
import UpgradeBanner from "./upgrade-banner";
import { useUpgradeStatus } from "./hooks/use-upgrade-status";

function AppSidebarContent() {
    const { showUpgradeBanner, trialDaysRemaining } = useUpgradeStatus();

    return (
        <SidebarContent className="px-3 pt-4 justify-between">
            <div className="flex flex-col gap-2 sidebar:gap-4">
                <NavMain />
                <NavContent />
                <NavGhostPro />
            </div>
            <div className="flex flex-col gap-2 sidebar:gap-4">
                {showUpgradeBanner ? <UpgradeBanner trialDaysRemaining={trialDaysRemaining} /> : <WhatsNewBanner />}
                <ThemeErrorsBanner />
                <NavSettings className="pb-0" />
            </div>
        </SidebarContent>
    )
}

export default AppSidebarContent;
