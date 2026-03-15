import {type RouteObject, Outlet, lazyComponent, redirect} from "@tryghost/admin-x-framework";

// ActivityPub
import { FeatureFlagsProvider, routes as activityPubRoutes } from "@tryghost/activitypub/src/index";

// Posts (aka tags and post analytics)
import PostsAppContextProvider from "@tryghost/posts/src/providers/posts-app-context";
import { routes as postRoutes } from "@tryghost/posts/src/routes";

// Stats (aka analytics)
import GlobalDataProvider from "@tryghost/stats/src/providers/global-data-provider";
import { routes as statsRoutes } from "@tryghost/stats/src/routes";
import MyProfileRedirect from "./my-profile-redirect";

// Ember
import { EmberFallback, ForceUpgradeGuard } from "./ember-bridge";
import type { RouteHandle } from "./ember-bridge";

export const routes: RouteObject[] = [
    {
        // ForceUpgradeGuard wraps all routes to redirect to /pro when in force upgrade mode.
        // Routes with handle.allowInForceUpgrade: true bypass this protection.
        element: <ForceUpgradeGuard />,
        children: [
            {
                // Override the tag detail route from the posts app to ensure we
                // correctly delegate to Ember since we can't remove the blank screen in
                // the posts app. The blank screen needs to be there to prevent the
                // router error fallback from triggering when navigating from the tag
                // list to a tag detail page.
                path: "/tags/:tagSlug",
                Component: EmberFallback,
                handle: { allowInForceUpgrade: true } satisfies RouteHandle,
            },
            {
                element: (
                    <PostsAppContextProvider value={{ fromAnalytics: true }}>
                        <Outlet />
                    </PostsAppContextProvider>
                ),
                // Filter out catch-all routes
                children: postRoutes[0].children!.filter((route) => route.path !== "*"),
            },
            {
                element: (
                    <GlobalDataProvider>
                        <Outlet />
                    </GlobalDataProvider>
                ),
                children: statsRoutes,
            },
            {
                path: `network`,
                loader: () => redirect("/activitypub"),
            },
            {
                path: "my-profile",
                Component: MyProfileRedirect,
                handle: { allowInForceUpgrade: true } satisfies RouteHandle,
            },
            {
                path: "",
                element: (
                    <FeatureFlagsProvider>
                        <Outlet />
                    </FeatureFlagsProvider>
                ),
                children: activityPubRoutes,
            },
            {
                path: `settings/*`,
                lazy: lazyComponent(() => import("./settings/settings")),
                handle: { allowInForceUpgrade: true } satisfies RouteHandle,
            },
            {
                // Catch-all route for Ember-handled routes (including /pro, /signout, etc.)
                // These must be allowed in force upgrade mode since Ember handles the actual protection
                path: "*",
                Component: EmberFallback,
                handle: { allowInForceUpgrade: true } satisfies RouteHandle,
            },
        ],
    },
];
