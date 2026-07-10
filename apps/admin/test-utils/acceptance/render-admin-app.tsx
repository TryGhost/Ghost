import { QueryClient } from "@tanstack/react-query";
import { render } from "vitest-browser-react";
import { configResponse, settingsResponse } from "@tryghost/test-data";
import type { TopLevelFrameworkProps } from "@tryghost/admin-x-framework";

import "@/index.css";
import { AdminAppRoot } from "@/app-root";

import { installBootOverrides, type BootOverrides } from "./boot";

export interface RenderAdminAppOptions {
    /**
     * Labs flags to flip for this test. Sugar that compiles to lockstep
     * settings + config boot overrides — the admin client reads labs from
     * BOTH, so they must flip together.
     */
    labs?: Record<string, boolean>;
    /**
     * Escape hatch over the shell boot table. The requests the admin shell
     * fires on boot (settings/config/site/me, sidebar members count, active
     * theme, the fire-and-forget user-preferences PUT) are handled by default —
     * specs never mention them. Pass `response`/`responseStatus` overrides
     * keyed by boot entry name to change one for a test, e.g.
     * `renderAdminApp("/", {boot: {browseConfig: {response: ...}}})`.
     * Matching keeps the default entry's method/path. Wins over `labs`.
     */
    boot?: BootOverrides;
}

/**
 * Boots the real admin app — the same provider stack as src/main.tsx, via the
 * shared AdminAppRoot — inside the browser-mode page, with the Ghost Admin
 * API served by MSW. `route` is the hash route to boot on, e.g. "/tags" or
 * "/members?filter=label:VIP".
 *
 * Cross-app navigations (Ember-owned routes) are recorded on
 * `document.body.dataset.externalNavigate` instead of navigating, mirroring
 * the Playwright acceptance harness so `expectExternalNavigate`-style
 * assertions can be ported.
 */
export async function renderAdminApp(route: string = "/", { labs, boot }: RenderAdminAppOptions = {}): Promise<
    Awaited<ReturnType<typeof render>>
> {
    const overrides: BootOverrides = {
        ...(labs && {
            browseSettings: { response: settingsResponse({ labs }) },
            browseConfig: { response: configResponse({ labs }) },
        }),
        ...boot,
    };

    if (Object.keys(overrides).length > 0) {
        installBootOverrides(overrides);
    }

    // EmberRoot expects the Ember host element to exist in the document; in
    // the test page there is no Ember app, so provide an empty stand-in.
    if (!document.getElementById("ember-app")) {
        const emberApp = document.createElement("div");
        emberApp.id = "ember-app";
        document.body.appendChild(emberApp);
    }

    // The framework RouterProvider is hash-based; set the initial route
    // before the router is created.
    window.location.hash = `#${route}`;

    // A fresh QueryClient per render, passed through FrameworkProvider's
    // queryClient seam: mirrors the production singleton's defaults
    // (admin-x-framework utils/query-client.ts) except nothing is cached
    // beyond the test, so tests are isolated without teardown scrubbing.
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                staleTime: 5 * (60 * 1000), // 5 mins
                cacheTime: 0,
                // We have custom retry logic for specific errors in fetchApi()
                retry: false,
                networkMode: "always",
            },
        },
    });

    const framework: TopLevelFrameworkProps = {
        ghostVersion: "",
        externalNavigate: (link) => {
            document.body.dataset.externalNavigate = JSON.stringify(link);
        },
        unsplashConfig: {
            Authorization: "",
            "Accept-Version": "v1",
            "Content-Type": "application/json",
            "App-Pragma": "no-cache",
            "X-Unsplash-Cache": true,
        },
        sentryDSN: null,
        onUpdate: () => {},
        onInvalidate: () => {},
        onDelete: () => {},
        queryClient,
    };

    return await render(<AdminAppRoot framework={framework} />);
}
