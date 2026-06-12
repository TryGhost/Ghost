import type { ReactNode } from "react";

import { useSidebarVisibility } from "@/ember-bridge/ember-bridge";
import ThemeErrorsBanner from "@/layout/app-sidebar/theme-errors-banner";
import UpgradeBanner from "@/layout/app-sidebar/upgrade-banner";
import WhatsNewBanner from "@/whats-new/components/whats-new-banner";

import { useUpgradeStatus } from "./use-upgrade-status";
import { useWhatsNewStatus } from "./use-whats-new-status";
import { useActiveThemeErrors } from "./use-theme-errors";

export interface SidebarBannerState {
    bannerType: 'theme-errors' | 'upgrade' | 'whats-new' | null;
    banner: ReactNode;
    hasBanner: boolean;
}

export function useSidebarBannerState(): SidebarBannerState {
    const {hasErrors} = useActiveThemeErrors();
    const {showUpgradeBanner, trialDaysRemaining} = useUpgradeStatus();
    const {showWhatsNewBanner} = useWhatsNewStatus();
    const sidebarVisible = useSidebarVisibility();

    if (!sidebarVisible) {
        return {
            bannerType: null,
            banner: null,
            hasBanner: false
        };
    }

    if (hasErrors) {
        return {
            bannerType: 'theme-errors',
            banner: <ThemeErrorsBanner />,
            hasBanner: true
        };
    }

    if (showUpgradeBanner) {
        return {
            bannerType: 'upgrade',
            banner: <UpgradeBanner trialDaysRemaining={trialDaysRemaining} />,
            hasBanner: true
        };
    }

    if (showWhatsNewBanner) {
        return {
            bannerType: 'whats-new',
            banner: <WhatsNewBanner />,
            hasBanner: true
        };
    }

    return {
        bannerType: null,
        banner: null,
        hasBanner: false
    };
}
