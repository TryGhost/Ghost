import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import AppSidebarBanner from "./app-sidebar-banner";
import type { SidebarBannerState } from "./hooks/use-sidebar-banner-state";

const mockUseSidebarBannerState = vi.fn<() => SidebarBannerState>(() => ({
    bannerType: null,
    banner: null,
    hasBanner: false
}));

vi.mock("./hooks/use-sidebar-banner-state", () => ({
    useSidebarBannerState: () => mockUseSidebarBannerState()
}));

describe("AppSidebarBanner", () => {
    beforeEach(() => {
        mockUseSidebarBannerState.mockReturnValue({
            bannerType: null,
            banner: null,
            hasBanner: false
        });
    });

    test("does not render when no banner is available", () => {
        const {container} = render(<AppSidebarBanner />);
        expect(container).toBeEmptyDOMElement();
    });

    test("renders banner from shared state hook", () => {
        mockUseSidebarBannerState.mockReturnValue({
            bannerType: 'theme-errors',
            banner: <div>Theme Error Banner</div>,
            hasBanner: true
        });

        render(<AppSidebarBanner />);

        expect(screen.getByText("Theme Error Banner")).toBeInTheDocument();
    });

    test("renders banner prop when explicitly provided", () => {
        mockUseSidebarBannerState.mockReturnValue({
            bannerType: 'theme-errors',
            banner: <div>Hook Banner</div>,
            hasBanner: true
        });

        render(<AppSidebarBanner banner={<div>Provided Banner</div>} />);

        expect(screen.getByText("Provided Banner")).toBeInTheDocument();
        expect(screen.queryByText("Hook Banner")).not.toBeInTheDocument();
    });
});
