import type { ReactNode } from "react";

import { useSidebarBannerState } from "./hooks/use-sidebar-banner-state";

interface AppSidebarBannerProps {
    banner?: ReactNode;
}

function AppSidebarBanner({banner}: AppSidebarBannerProps) {
    const sidebarBannerState = useSidebarBannerState();
    const resolvedBanner = banner ?? sidebarBannerState.banner;

    if (!resolvedBanner) {
        return null;
    }

    return (
        <div className="fixed bottom-[92px] left-3 z-50 max-w-[276px]">
            {resolvedBanner}
        </div>
    );
}

export default AppSidebarBanner;
