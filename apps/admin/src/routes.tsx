import {type RouteObject, Outlet, lazyComponent, redirect} from "@tryghost/admin-x-framework";

// ActivityPub
import { FeatureFlagsProvider, routes as activityPubRoutes } from "@tryghost/activitypub/api";

// Posts (aka tags and post analytics)
import { PostsAppContextProvider, routes as postRoutes } from "@tryghost/posts/api";

// Stats (aka analytics)
import { GlobalDataProvider, routes as statsRoutes } from "@tryghost/stats/api";
import MyProfileRedirect from "./my-profile-redirect";

// Ember
import { EmberFallback, ForceUpgradeGuard } from "./ember-bridge";
import type { RouteHandle } from "./ember-bridge";
import { MembersRoute } from "./members-route";

import { NotFound } from "./not-found";

// Routes handled by the Ember admin app. React delegates these to Ember via
// EmberFallback. When migrating a route to React, remove its entry from here.
const EMBER_ROUTES: string[] = [
    "/",
    "/dashboard",
    "/site",
    "/launch",
    "/setup/*",
    "/signin/*",
    "/signout",
    "/signup/*",
    "/reset/*",
    "/pro/*",
    "/posts",
    "/posts/analytics/:postId/mentions",
    "/posts/analytics/:postId/debug",
    "/restore",
    "/pages",
    "/editor/*",
    "/tags/new",
    "/explore/*",
    "/migrate/*",
    "/members/new",
    "/members/:member_id",
    "/members-activity",
    "/designsandbox",
    "/mentions",
];

const emberFallbackHandle = { allowInForceUpgrade: true } satisfies RouteHandle;

const emberFallbackRoutes: RouteObject[] = EMBER_ROUTES.map(path => ({
    path,
    Component: EmberFallback,
    handle: emberFallbackHandle,
}));

const membersRoute: RouteObject = {
    path: "/members",
    element: <MembersRoute />,
    handle: emberFallbackHandle,
    children: [
        {
            index: true,
            lazy: lazyComponent(() => import("@tryghost/posts/members"))
        },
        {
            path: "import",
            lazy: lazyComponent(() => import("@tryghost/posts/members"))
        }
    ]
};

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
                handle: emberFallbackHandle,
            },
            membersRoute,
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
            // Ember-handled routes
            ...emberFallbackRoutes,
            {
                // 404 catch-all for routes not handled by React or Ember
                path: "*",
                Component: NotFound,
            },
        ],
    },
];
