import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFlagGatedRoute } from "./auth-flag-gated-route";

const mocks = vi.hoisted(() => ({
    useBrowseSite: vi.fn(),
    useCurrentUser: vi.fn(),
}));

vi.mock("@tryghost/admin-x-framework/helpers", () => ({
    getGhostPaths: () => ({ adminRoot: "/ghost/" }),
}));

vi.mock("@tryghost/admin-x-framework/api/site", () => ({
    useBrowseSite: mocks.useBrowseSite,
}));

vi.mock("@tryghost/admin-x-framework/api/current-user", () => ({
    useCurrentUser: mocks.useCurrentUser,
}));

vi.mock("@/ember-bridge", () => ({
    EmberFallback: () => <div data-testid="ember-fallback" />,
}));

const Screen = () => <div data-testid="auth-screen" />;

function mockSite(authX: boolean | undefined, isLoading = false) {
    mocks.useBrowseSite.mockReturnValue({
        data: authX === undefined ? undefined : { site: { authX } },
        isLoading,
    });
}

function mockUser(user: object | undefined, isLoading = false) {
    mocks.useCurrentUser.mockReturnValue({ data: user, isLoading });
}

const originalLocation = window.location;

function stubLocationReplace() {
    const replace = vi.fn();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...originalLocation, replace },
    });
    return replace;
}

describe("AuthFlagGatedRoute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUser(undefined);
    });

    afterEach(() => {
        Object.defineProperty(window, "location", {
            configurable: true,
            value: originalLocation,
        });
        window.sessionStorage.clear();
    });

    it("renders nothing while the site is loading", () => {
        mockSite(undefined, true);

        const { container } = render(<AuthFlagGatedRoute component={Screen} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing while the current user is loading", () => {
        mockSite(true);
        mockUser(undefined, true);

        const { container } = render(<AuthFlagGatedRoute component={Screen} />);

        expect(container).toBeEmptyDOMElement();
    });

    it("renders the Ember fallback when the flag is disabled", () => {
        mockSite(false);

        render(<AuthFlagGatedRoute component={Screen} />);

        expect(screen.getByTestId("ember-fallback")).toBeInTheDocument();
        expect(screen.queryByTestId("auth-screen")).not.toBeInTheDocument();
    });

    it("renders the Ember fallback when the flag is disabled without waiting for the current user", () => {
        // flag-off behavior must match the pre-slice admin, which never
        // gated its auth screens on /users/me settling
        mockSite(false);
        mockUser(undefined, true);

        render(<AuthFlagGatedRoute component={Screen} />);

        expect(screen.getByTestId("ember-fallback")).toBeInTheDocument();
    });

    it("renders the React screen when the flag is enabled", () => {
        mockSite(true);

        render(<AuthFlagGatedRoute component={Screen} />);

        expect(screen.getByTestId("auth-screen")).toBeInTheDocument();
        expect(screen.queryByTestId("ember-fallback")).not.toBeInTheDocument();
    });

    it("redirects authenticated users to home", () => {
        mockSite(true);
        mockUser({ id: "1" });
        const replace = stubLocationReplace();

        render(<AuthFlagGatedRoute component={Screen} />);

        expect(replace).toHaveBeenCalledWith("/ghost/#/");
        expect(screen.queryByTestId("auth-screen")).not.toBeInTheDocument();
    });

    it("redirects authenticated users to their stored deep link and clears it", () => {
        mockSite(true);
        mockUser({ id: "1" });
        window.sessionStorage.setItem("ghost-signin-redirect", "/tags");
        const replace = stubLocationReplace();

        render(<AuthFlagGatedRoute component={Screen} />);

        expect(replace).toHaveBeenCalledWith("/ghost/#/tags");
        expect(window.sessionStorage.getItem("ghost-signin-redirect")).toBeNull();
    });

    it("keeps the deep link target on re-renders after the key is cleared", () => {
        // query refetches re-render the gate before the redirect lands;
        // re-reading the (now cleared) key would bounce home instead
        mockSite(true);
        mockUser({ id: "1" });
        window.sessionStorage.setItem("ghost-signin-redirect", "/tags");
        const replace = stubLocationReplace();

        const { rerender } = render(<AuthFlagGatedRoute component={Screen} />);
        expect(window.sessionStorage.getItem("ghost-signin-redirect")).toBeNull();

        rerender(<AuthFlagGatedRoute component={Screen} />);

        expect(replace).toHaveBeenCalledWith("/ghost/#/tags");
        expect(replace).not.toHaveBeenCalledWith("/ghost/#/");
    });

    it("renders the screen for authenticated users when allowAuthenticated is set", () => {
        mockSite(true);
        mockUser({ id: "1" });

        render(<AuthFlagGatedRoute allowAuthenticated component={Screen} />);

        expect(screen.getByTestId("auth-screen")).toBeInTheDocument();
    });
});
