import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useSidebarBannerState } from "./use-sidebar-banner-state";

const mockUseSidebarVisibility = vi.fn<() => boolean>(() => true);
const mockUseActiveThemeErrors = vi.fn<() => {hasErrors: boolean}>(() => ({hasErrors: false}));
const mockUseUpgradeStatus = vi.fn<() => {showUpgradeBanner: boolean; trialDaysRemaining: number}>(() => ({showUpgradeBanner: false, trialDaysRemaining: 0}));
const mockUseWhatsNewStatus = vi.fn<() => {showWhatsNewBanner: boolean}>(() => ({showWhatsNewBanner: false}));

vi.mock("@/ember-bridge/ember-bridge", () => ({
    useSidebarVisibility: () => mockUseSidebarVisibility(),
}));

vi.mock("./use-theme-errors", () => ({
    useActiveThemeErrors: () => mockUseActiveThemeErrors(),
}));

vi.mock("./use-upgrade-status", () => ({
    useUpgradeStatus: () => mockUseUpgradeStatus(),
}));

vi.mock("./use-whats-new-status", () => ({
    useWhatsNewStatus: () => mockUseWhatsNewStatus(),
}));

vi.mock("../theme-errors-banner", () => ({
    default: () => <div>Theme Error Banner</div>,
}));

vi.mock("../upgrade-banner", () => ({
    default: ({trialDaysRemaining}: {trialDaysRemaining: number}) => <div>Upgrade Banner ({trialDaysRemaining})</div>,
}));

vi.mock("@/whats-new/components/whats-new-banner", () => ({
    default: () => <div>Whats New Banner</div>,
}));

describe("useSidebarBannerState", () => {
    beforeEach(() => {
        mockUseSidebarVisibility.mockReturnValue(true);
        mockUseActiveThemeErrors.mockReturnValue({hasErrors: false});
        mockUseUpgradeStatus.mockReturnValue({showUpgradeBanner: false, trialDaysRemaining: 0});
        mockUseWhatsNewStatus.mockReturnValue({showWhatsNewBanner: false});
    });

    test("returns no banner when editor is open", () => {
        mockUseSidebarVisibility.mockReturnValue(false);
        mockUseActiveThemeErrors.mockReturnValue({hasErrors: true});
        mockUseUpgradeStatus.mockReturnValue({showUpgradeBanner: true, trialDaysRemaining: 7});
        mockUseWhatsNewStatus.mockReturnValue({showWhatsNewBanner: true});

        const {result} = renderHook(() => useSidebarBannerState());

        expect(result.current.hasBanner).toBe(false);
        expect(result.current.banner).toBeNull();
        expect(result.current.bannerType).toBeNull();
    });

    test("prefers theme error banner over other banners", () => {
        mockUseActiveThemeErrors.mockReturnValue({hasErrors: true});
        mockUseUpgradeStatus.mockReturnValue({showUpgradeBanner: true, trialDaysRemaining: 7});
        mockUseWhatsNewStatus.mockReturnValue({showWhatsNewBanner: true});

        const {result} = renderHook(() => useSidebarBannerState());

        expect(result.current.hasBanner).toBe(true);
        expect(result.current.bannerType).toBe('theme-errors');
    });

    test("returns upgrade banner state when only upgrade is active", () => {
        mockUseUpgradeStatus.mockReturnValue({showUpgradeBanner: true, trialDaysRemaining: 7});

        const {result} = renderHook(() => useSidebarBannerState());

        expect(result.current.hasBanner).toBe(true);
        expect(result.current.bannerType).toBe('upgrade');
    });

    test("returns whats new banner state when only whats new is active", () => {
        mockUseWhatsNewStatus.mockReturnValue({showWhatsNewBanner: true});

        const {result} = renderHook(() => useSidebarBannerState());

        expect(result.current.hasBanner).toBe(true);
        expect(result.current.bannerType).toBe('whats-new');
    });
});
