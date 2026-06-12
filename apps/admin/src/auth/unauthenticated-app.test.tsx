import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SIGNIN_REDIRECT_KEY } from "./signin-redirect";
import { UnauthenticatedApp } from "./unauthenticated-app";

const mocks = vi.hoisted(() => ({
    useBrowseSite: vi.fn(),
    useLocation: vi.fn(),
}));

vi.mock("@tryghost/admin-x-framework", () => ({
    Navigate: ({ replace, to }: { replace?: boolean; to: string }) => (
        <div data-replace={String(Boolean(replace))} data-testid="navigate" data-to={to} />
    ),
    Outlet: () => <div data-testid="outlet" />,
    useLocation: mocks.useLocation,
}));

vi.mock("@tryghost/admin-x-framework/api/site", () => ({
    useBrowseSite: mocks.useBrowseSite,
}));

vi.mock("@/ember-bridge", () => ({
    EmberFallback: () => <div data-testid="ember-fallback" />,
}));

function mockSite(authX: boolean | undefined, isLoading = false) {
    mocks.useBrowseSite.mockReturnValue({
        data: authX === undefined ? undefined : { site: { authX } },
        isLoading,
    });
}

function mockLocation(pathname: string, search = "") {
    mocks.useLocation.mockReturnValue({ pathname, search });
}

describe("UnauthenticatedApp", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.sessionStorage.clear();
        mockSite(true);
        mockLocation("/tags");
    });

    it.each([
        "/signin",
        "/signin/verify",
        "/signout",
        "/signup/some-token",
        "/reset/some-token",
        "/setup",
    ])("renders the router outlet on auth path %s", (pathname) => {
        mockLocation(pathname);

        render(<UnauthenticatedApp isCurrentUserLoading={false} />);

        expect(screen.getByTestId("outlet")).toBeInTheDocument();
    });

    it("renders nothing while the current user is still loading", () => {
        const { container } = render(<UnauthenticatedApp isCurrentUserLoading={true} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing while the site is still loading", () => {
        mockSite(undefined, true);

        const { container } = render(<UnauthenticatedApp isCurrentUserLoading={false} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders the Ember fallback on non-auth paths when the flag is off", () => {
        mockSite(false);

        render(<UnauthenticatedApp isCurrentUserLoading={false} />);

        expect(screen.getByTestId("ember-fallback")).toBeInTheDocument();
        expect(window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY)).toBeNull();
    });

    it("renders the Ember fallback when the flag is off without waiting for the current user", () => {
        // flag-off behavior must match the pre-slice admin, which never
        // gated its boot on /users/me settling
        mockSite(false);

        render(<UnauthenticatedApp isCurrentUserLoading={true} />);

        expect(screen.getByTestId("ember-fallback")).toBeInTheDocument();
    });

    it("stores the attempted URL and redirects to signin when the flag is on", () => {
        mockLocation("/settings/newsletters/", "?verifyEmail=token-xyz");

        render(<UnauthenticatedApp isCurrentUserLoading={false} />);

        expect(window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY)).toBe("/settings/newsletters/?verifyEmail=token-xyz");
        expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/signin");
        expect(screen.getByTestId("navigate")).toHaveAttribute("data-replace", "true");
    });

    it("treats /setup/onboarding as a regular (non-auth) route", () => {
        mockLocation("/setup/onboarding");

        render(<UnauthenticatedApp isCurrentUserLoading={false} />);

        expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/signin");
    });
});
