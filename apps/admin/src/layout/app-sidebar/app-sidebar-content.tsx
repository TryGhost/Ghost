import {
    SidebarContent,
} from "@tryghost/shade"

import AppSidebarBanner from "./app-sidebar-banner";
import NavMain from "./nav-main";
import NavContent from "./nav-content";
import NavGhostPro from "./nav-ghost-pro";
import NavSettings from "./nav-settings";
import { useSidebarBannerState } from "./hooks/use-sidebar-banner-state";

function AppSidebarContent() {
    const {banner, bannerType} = useSidebarBannerState();
    let bannerContainerClassName = '';

    if (bannerType === 'theme-errors') {
        bannerContainerClassName = 'pb-[110px]';
    } else if (bannerType === 'upgrade') {
        bannerContainerClassName = 'pb-[254px]';
    } else if (bannerType === 'whats-new') {
        bannerContainerClassName = 'pb-[180px]';
    }

    return (
        <SidebarContent className="px-3 pt-4 justify-between">
            <div className="flex flex-col gap-2 sidebar:gap-4">
                <NavMain />
                <NavContent />
                <NavGhostPro />
            </div>
            <div className={`flex flex-col gap-2 sidebar:gap-4 ${bannerContainerClassName}`}>
                <AppSidebarBanner banner={banner} />
                <NavSettings className="pb-0" />
            </div>
        </SidebarContent>
    )
}

export default AppSidebarContent;
