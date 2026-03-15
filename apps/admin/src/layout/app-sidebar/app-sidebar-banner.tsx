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
        <div className="fixed left-3 bottom-[92px] max-w-[276px] z-50">
            {resolvedBanner}
        </div>
    );
}

export default AppSidebarBanner;
