import { describe, expect, it, vi, beforeEach } from "vitest";
import { lazy } from "react";
import { render, screen } from "@testing-library/react";
import { FlagGatedRoute } from "./flag-gated-route";

const mocks = vi.hoisted(() => ({
    useBrowseConfig: vi.fn(),
}));

vi.mock("@tryghost/admin-x-framework/api/config", () => ({
    useBrowseConfig: mocks.useBrowseConfig,
}));

vi.mock("./ember-bridge", () => ({
    EmberFallback: () => <div data-testid="ember-fallback" />,
}));

const LazyScreen = lazy(() =>
    Promise.resolve({ default: () => <div data-testid="react-screen" /> }),
);

function mockConfig(labs: Record<string, boolean> | undefined, isLoading = false) {
    mocks.useBrowseConfig.mockReturnValue({
        data: labs === undefined ? undefined : { config: { labs } },
        isLoading,
    });
}

describe("FlagGatedRoute", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders nothing while the config is loading", () => {
        mockConfig(undefined, true);

        const { container } = render(
            <FlagGatedRoute component={LazyScreen} flag="tagDetailsX" />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    it("renders the Ember fallback when the flag is disabled", () => {
        mockConfig({ tagDetailsX: false });

        render(<FlagGatedRoute component={LazyScreen} flag="tagDetailsX" />);

        expect(screen.getByTestId("ember-fallback")).toBeInTheDocument();
    });

    it("renders the Ember fallback when the flag is missing", () => {
        mockConfig({});

        render(<FlagGatedRoute component={LazyScreen} flag="tagDetailsX" />);

        expect(screen.getByTestId("ember-fallback")).toBeInTheDocument();
    });

    it("renders the React screen when the flag is enabled", async () => {
        mockConfig({ tagDetailsX: true });

        render(<FlagGatedRoute component={LazyScreen} flag="tagDetailsX" />);

        expect(await screen.findByTestId("react-screen")).toBeInTheDocument();
        expect(screen.queryByTestId("ember-fallback")).not.toBeInTheDocument();
    });
});
