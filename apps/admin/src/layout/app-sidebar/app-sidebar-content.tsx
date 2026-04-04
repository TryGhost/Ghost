import {SidebarContent} from "@tryghost/shade/components"

import AppSidebarBanner from "./app-sidebar-banner";
import NavMain from "./nav-main";
import NavContent from "./nav-content";
import NavGhostPro from "./nav-ghost-pro";
import NavSettings from "./nav-settings";
import { useSidebarBannerState } from "./hooks/use-sidebar-banner-state";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

function AppSidebarContent() {
    const {banner, bannerType} = useSidebarBannerState();
    const adminUiRedesign = useFeatureFlag('adminUiRedesign');
    let bannerContainerClassName = '';

    if (bannerType === 'theme-errors') {
        bannerContainerClassName = 'pb-[110px]';
    } else if (bannerType === 'upgrade') {
        bannerContainerClassName = 'pb-[254px]';
    } else if (bannerType === 'whats-new') {
        bannerContainerClassName = 'pb-[180px]';
    }

    return (
        <SidebarContent className="justify-between px-3 pt-4">
            <div className={adminUiRedesign ? "flex flex-col" : "flex flex-col gap-2 sidebar:gap-4"}>
                <NavMain />
                <NavContent />
                <NavGhostPro className={adminUiRedesign ? "hidden" : undefined} />
            </div>
            <div className={`flex flex-col gap-2 sidebar:gap-4 ${bannerContainerClassName}`}>
                <AppSidebarBanner banner={banner} />
                <NavSettings className={adminUiRedesign ? "hidden pb-0" : "pb-0"} />
            </div>
        </SidebarContent>
    )
}

export default AppSidebarContent;
