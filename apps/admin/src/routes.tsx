import {type AdminRouteHandle, type RouteObject, Outlet, lazyComponent, redirect} from "@tryghost/admin-x-framework";

// ActivityPub
import { FeatureFlagsProvider, routes as activityPubRoutes } from "@tryghost/activitypub/api";


// Stats (aka analytics)
import { AnalyticsProvider, analyticsRouteChildren } from "./analytics/api";
import MyProfileRedirect from "./my-profile-redirect";

// Ember
import { EmberFallback, ForceUpgradeGuard } from "./ember-bridge";
import type { RouteHandle } from "./ember-bridge";
import { EmberListWithGiftLinks } from "./gift-link-modal-host";
import { MemberDetailGate } from "./member-detail-gate";
import { MembersRoute } from "./members-route";
import { OnboardingRedirect } from "./onboarding/onboarding-redirect";

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
    "/posts/analytics/:postId/mentions",
    "/posts/analytics/:postId/debug",
    "/restore",
    "/editor/*",
    "/tags/new",
    "/explore/*",
    "/migrate/*",
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
            lazy: lazyComponent(() => import("./members/members"))
        },
        {
            path: "import",
            lazy: lazyComponent(() => import("./members/members"))
        },
        {
            // Covers both edit (`:member_id`) and create (the sentinel `new`)
            // — real member ids are 24-char hex ObjectIds, so they can't
            // collide with the literal "new".
            //
            // MemberDetailGate serves Ember or React depending on the
            // `memberDetailsReact` Labs flag; the parent route's
            // emberFallbackHandle covers both, since ForceUpgradeGuard checks
            // every match rather than just the leaf.
            path: ":member_id",
            Component: MemberDetailGate
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
                path: "/tags",
                lazy: lazyComponent(() => import("./tags/tags")),
            },
            {
                path: "/comments",
                lazy: lazyComponent(() => import("./comments/comments")),
            },
            {
                path: "/automations",
                lazy: lazyComponent(() => import("./automations/automations")),
            },
            {
                // The automation editor hides the admin sidebar for a focused,
                // full-screen editing surface.
                path: "/automations/:id",
                handle: {hideAdminSidebar: true} satisfies AdminRouteHandle,
                lazy: lazyComponent(() => import("./automations/editor")),
            },
            {
                // The tag detail route delegates to Ember. It must be declared
                // so navigating from the tag list to a detail page doesn't trip
                // the router error fallback before Ember takes over.
                path: "/tags/:tagSlug",
                Component: EmberFallback,
                handle: emberFallbackHandle,
            },
            membersRoute,
            {
                path: "/posts/analytics/:postId",
                lazy: async () => {
                    const [{ default: PostAnalyticsProvider }, { default: PostAnalytics }] = await Promise.all([
                        import("./posts/analytics/providers/post-analytics-provider"),
                        import("./posts/analytics/post-analytics"),
                    ]);
                    return {
                        element: (
                            <PostAnalyticsProvider>
                                <PostAnalytics />
                            </PostAnalyticsProvider>
                        ),
                    };
                },
                children: [
                    { path: "", lazy: lazyComponent(() => import("./posts/analytics/Overview/overview")) },
                    { path: "web", lazy: lazyComponent(() => import("./posts/analytics/Web/web")) },
                    { path: "growth", lazy: lazyComponent(() => import("./posts/analytics/Growth/growth")) },
                    { path: "newsletter", lazy: lazyComponent(() => import("./posts/analytics/Newsletter/newsletter")) },
                ],
            },
            {
                // Analytics routes folded directly into the shell table. The
                // AnalyticsProvider is attached to this route node (via its
                // element) rather than a separate wrapper subtree; OnboardingRedirect
                // still gates entry.
                path: "analytics",
                element: (
                    <OnboardingRedirect>
                        <AnalyticsProvider>
                            <Outlet />
                        </AnalyticsProvider>
                    </OnboardingRedirect>
                ),
                children: analyticsRouteChildren,
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
            {path: "/posts", Component: EmberListWithGiftLinks, handle: emberFallbackHandle},
            {path: "/pages", Component: EmberListWithGiftLinks, handle: emberFallbackHandle},
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
