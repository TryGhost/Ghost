import { QueryClient } from "@tanstack/react-query";
import { render } from "vitest-browser-react";
import { configResponse, settingsResponse } from "@tryghost/test-data";
import type { TopLevelFrameworkProps } from "@tryghost/admin-x-framework";

import "@/index.css";
import { AdminAppRoot } from "@/app-root";

import { installBootOverrides, type BootOverrides } from "./boot";

export interface RenderAdminAppOptions {
    /**
     * Labs flags for this test; compiles to lockstep settings + config boot
     * overrides (the admin client reads labs from both).
     */
    labs?: Record<string, boolean>;
    /** Boot-table overrides keyed by entry name (see boot.ts); wins over `labs`. */
    boot?: BootOverrides;
}

/**
 * The app's current hash route (e.g. "/members?filter=..."), for URL
 * assertions: `await expect.poll(currentRoute).toBe("/members")`.
 */
export function currentRoute(): string {
    return window.location.hash.replace(/^#/, "");
}

/**
 * Boots the real admin app (the same provider stack as src/main.tsx) at the
 * given hash route, e.g. "/tags" or "/members?filter=label:VIP". Cross-app
 * (Ember-owned) navigations are recorded on
 * `document.body.dataset.externalNavigate` instead of navigating.
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

    // Mirror the production host page (index.html): the react-admin body
    // class and the #root mount point drive the shell's grid layout — without
    // them the body grows with content and virtualized lists never scroll.
    document.body.classList.add("react-admin");
    let rootElement = document.getElementById("root");
    if (!rootElement) {
        rootElement = document.createElement("div");
        rootElement.id = "root";
        document.body.appendChild(rootElement);
    }

    // EmberRoot expects the Ember host element to exist; there is no Ember
    // app in the test page, so provide an empty stand-in.
    if (!document.getElementById("ember-app")) {
        const emberApp = document.createElement("div");
        emberApp.id = "ember-app";
        document.body.appendChild(emberApp);
    }

    // The framework RouterProvider is hash-based; set the initial route
    // before the router is created.
    window.location.hash = `#${route}`;

    // Fresh QueryClient per render, mirroring the production defaults
    // (admin-x-framework utils/query-client.ts) so nothing outlives the test.
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                staleTime: 5 * (60 * 1000), // 5 mins
                gcTime: 10 * (60 * 1000), // 10 mins
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

    return await render(<AdminAppRoot framework={framework} />, { container: rootElement });
}
