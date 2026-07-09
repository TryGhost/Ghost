import {SidebarContent} from "@tryghost/shade/components"
import {Stack} from "@tryghost/shade/primitives";

import AppSidebarBanner from "./app-sidebar-banner";
import NavMain from "./nav-main";
import NavContent from "./nav-content";
import { NavAddons } from "./nav-addons";
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
        <SidebarContent className="justify-between px-3 pt-4 pb-1">
            <Stack className="sidebar:gap-4" gap="sm">
                <NavMain />
                <NavContent />
                <NavAddons />
                <NavGhostPro />
            </Stack>
            <Stack className={`sidebar:gap-4 ${bannerContainerClassName}`} gap="sm">
                <AppSidebarBanner banner={banner} />
                <NavSettings className="pb-0" />
            </Stack>
        </SidebarContent>
    )
}

export default AppSidebarContent;
