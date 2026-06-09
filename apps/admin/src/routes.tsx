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
import { OnboardingRedirect } from "./onboarding/onboarding-redirect";
import { TagDetailsRoute } from "./tag-details-route";

import { NotFound } from "./not-found";

// Routes handled by the Ember admin app. React delegates these to Ember via
// EmberFallback. When migrating a route to React, remove its entry from here.
const EMBER_ROUTES: string[] = [
    "/",
    "/dashboard",
    "/site",
    "/launch",
    "/setup",
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
                // Override the tag detail route from the posts app: renders the React
                // tag detail screen when the tagDetailsX labs flag is enabled and
                // delegates to Ember otherwise. This override (rather than the posts
                // app's own blank :tagSlug route) needs to exist to prevent the router
                // error fallback from triggering when navigating from the tag list to
                // a tag detail page.
                // Note: deliberately no allowInForceUpgrade handle — when the
                // tagDetailsX flag is on this renders a functional React screen,
                // which must redirect to /pro in force-upgrade mode like every
                // other React route (when the flag is off, /pro is itself an
                // Ember fallback that shows the billing screen).
                path: "/tags/new",
                Component: TagDetailsRoute,
            },
            {
                path: "/tags/:tagSlug",
                Component: TagDetailsRoute,
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
                    <OnboardingRedirect>
                        <GlobalDataProvider>
                            <Outlet />
                        </GlobalDataProvider>
                    </OnboardingRedirect>
                ),
                children: statsRoutes,
            },
            {
                path: "setup/onboarding",
                lazy: lazyComponent(() => import("./onboarding/onboarding-route")),
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
