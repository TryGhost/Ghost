import {
    SidebarContent,
} from "@tryghost/shade"
import type { ReactNode } from "react";

import WhatsNewBanner from "@/whats-new/components/whats-new-banner";

import NavMain from "./nav-main";
import NavContent from "./nav-content";
import NavGhostPro from "./nav-ghost-pro";
import NavSettings from "./nav-settings";
import ThemeErrorsBanner from "./theme-errors-banner";
import UpgradeBanner from "./upgrade-banner";
import { useUpgradeStatus } from "./hooks/use-upgrade-status";
import { useWhatsNewStatus } from "./hooks/use-whats-new-status";
import { useActiveThemeErrors } from "./hooks/use-theme-errors";

function AppSidebarContent() {
    const {hasErrors} = useActiveThemeErrors();
    const { showUpgradeBanner, trialDaysRemaining } = useUpgradeStatus();
    const { showWhatsNewBanner } = useWhatsNewStatus();
    let banner: ReactNode = null;
    let bannerContainerClassName = '';

    if (hasErrors) {
        banner = <ThemeErrorsBanner />;
        bannerContainerClassName = 'pb-[110px]';
    } else {
        if (showUpgradeBanner) {
            banner = <UpgradeBanner trialDaysRemaining={trialDaysRemaining} />;
            bannerContainerClassName = 'pb-[254px]';
        } else if (showWhatsNewBanner) {
            banner = <WhatsNewBanner />;
            bannerContainerClassName = 'pb-[180px]';
        }
    }

    return (
        <SidebarContent className={`px-3 pt-4 ${!banner && 'justify-between'}`}>
            <div className="flex flex-col gap-2 sidebar:gap-4">
                <NavMain />
                <NavContent />
                <NavGhostPro />
            </div>
            <div className={`flex flex-col gap-2 sidebar:gap-4 ${bannerContainerClassName}`}>
                {banner &&
                    <div className="fixed left-3 bottom-[92px] max-w-[276px] z-50">
                        {banner}
                    </div>
                }
                <NavSettings className="pb-0" />
            </div>
        </SidebarContent>
    )
}

export default AppSidebarContent;
