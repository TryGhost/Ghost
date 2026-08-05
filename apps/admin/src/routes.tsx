import {type AdminRouteHandle, type RouteObject, Outlet, lazyComponent, redirect} from "@tryghost/admin-x-framework";

// ActivityPub
import { FeatureFlagsProvider, routes as activityPubRoutes } from "@tryghost/activitypub/api";


// Stats (aka analytics)
import { AnalyticsProvider, analyticsRouteChildren } from "./analytics/api";
import MyProfileRedirect from "./my-profile-redirect";

// Ember
import { EmberFallback, ForceUpgradeGuard } from "./ember-bridge";
import type { RouteHandle } from "./ember-bridge";
import HomeRedirect from "./home-redirect";
import { MemberDetailGate } from "./member-detail-gate";
import { PagesListGate, PostsListGate } from "./posts-list-gate";
import { TagDetailGate } from "./tag-detail-gate";
import { OnboardingRedirect } from "./onboarding/onboarding-redirect";
import { type AccessRouteHandle, RouteAccessGuard } from "./route-access-guard";
import { canAccessSettingsRoute } from "./settings/settings-access";
import { canManageAutomations, canManageMembers, canManageTags } from "@tryghost/admin-x-framework/api/users";

import { NotFound } from "./not-found";

// Routes handled by the Ember admin app. React delegates these to Ember via
// EmberFallback. When migrating a route to React, remove its entry from here.
const EMBER_ROUTES: string[] = [
    "/site",
    "/setup",
    "/signin/*",
    "/signout",
    "/signup/*",
    "/reset/*",
    "/pro/*",
    "/posts/analytics/:postId/debug",
    "/restore",
    "/editor/*",
    "/explore/*",
    "/migrate/*",
    "/members-activity",
];

const emberFallbackHandle = { allowInForceUpgrade: true } satisfies RouteHandle;

/**
 * Ember routes that hide the nav sidebar.
 *
 * The editor is a focused writing surface and has always hidden it. Ember
 * arranges that by setting `ui.isFullScreen` when the editor route *activates* —
 * but with `postsListReact` on, the posts route aborts its transition, so the
 * editor route never deactivates, and a second visit is a model change on an
 * already-active route where `activate()` does not run again. The sidebar came
 * back from the second post onwards.
 *
 * Deciding it from the route makes React the authority and removes the
 * cross-implementation handshake, which had already caused the mirror-image bug
 * (the sidebar going *missing* on returning from the editor).
 */
const EMBER_ROUTES_HIDING_SIDEBAR = new Set(["/editor/*"]);

const emberFallbackRoutes: RouteObject[] = EMBER_ROUTES.map(path => ({
    path,
    Component: EmberFallback,
    handle: EMBER_ROUTES_HIDING_SIDEBAR.has(path)
        ? { ...emberFallbackHandle, hideAdminSidebar: true } satisfies RouteHandle & AdminRouteHandle
        : emberFallbackHandle,
}));

const membersRoute: RouteObject = {
    path: "/members",
    handle: { ...emberFallbackHandle, requiresAccess: canManageMembers } satisfies RouteHandle & AccessRouteHandle,
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

const appRoutes: RouteObject[] = [
    {
        // Role-based landing dispatch, including the hosted-signup
        // `/?firstStart=true` onboarding entry.
        path: "/",
        Component: HomeRedirect,
        handle: { allowInForceUpgrade: true } satisfies RouteHandle,
    },
    {
        // The dashboard screen is retired; the URL redirects for old links.
        path: "dashboard",
        loader: () => redirect("/analytics"),
    },
    {
        path: "/tags",
        handle: { requiresAccess: canManageTags } satisfies AccessRouteHandle,
        lazy: lazyComponent(() => import("./tags/tags")),
    },
    {
        path: "/comments",
        handle: { requiresAccess: canManageMembers } satisfies AccessRouteHandle,
        lazy: lazyComponent(() => import("./comments/comments")),
    },
    {
        path: "/automations",
        handle: { requiresAccess: canManageAutomations } satisfies AccessRouteHandle,
        lazy: lazyComponent(() => import("./automations/automations")),
    },
    {
        // The automation editor hides the admin sidebar for a focused,
        // full-screen editing surface.
        path: "/automations/:id",
        handle: {hideAdminSidebar: true, requiresAccess: canManageAutomations} satisfies AdminRouteHandle & AccessRouteHandle,
        lazy: lazyComponent(() => import("./automations/editor")),
    },
    {
        // Covers both edit (`:tagSlug`) and create (the sentinel `new`) —
        // Ember's router declared `/tags/new` before `/tags/:tag_slug`, so a
        // tag with the literal slug "new" was already unreachable.
        //
        // TagDetailGate serves Ember or React depending on the
        // `tagDetailsReact` Labs flag.
        path: "/tags/:tagSlug",
        Component: TagDetailGate,
        handle: {requiresAccess: canManageTags} satisfies AccessRouteHandle,
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
            { path: "", lazy: lazyComponent(() => import("./posts/analytics/overview/overview")) },
            { path: "web", lazy: lazyComponent(() => import("./posts/analytics/web/web")) },
            { path: "growth", lazy: lazyComponent(() => import("./posts/analytics/growth/growth")) },
            { path: "newsletter", lazy: lazyComponent(() => import("./posts/analytics/newsletter/newsletter")) },
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
        // hideAdminSidebar lives on the handle, not the lazy module, so the shell
        // hides at first paint instead of waiting on the settings chunk.
        path: `settings/*`,
        lazy: lazyComponent(() => import("./settings/settings")),
        handle: {
            allowInForceUpgrade: true,
            hideAdminSidebar: true,
            requiresAccess: canAccessSettingsRoute
        } satisfies RouteHandle & AdminRouteHandle & AccessRouteHandle,
    },
    // Served by React or Ember depending on the `postsListReact` Labs flag.
    // The handle stays emberFallbackHandle so force-upgrade behaves the same
    // on both sides of the flag.
    {path: "/posts", Component: PostsListGate, handle: emberFallbackHandle},
    {path: "/pages", Component: PagesListGate, handle: emberFallbackHandle},
    // Ember-handled routes
    ...emberFallbackRoutes,
    {
        // 404 catch-all for routes not handled by React or Ember
        path: "*",
        Component: NotFound,
    },
];

export const routes: RouteObject[] = [
    {
        // ForceUpgradeGuard wraps all routes to redirect to /pro when in force upgrade mode.
        // Routes with handle.allowInForceUpgrade: true bypass this protection.
        element: <ForceUpgradeGuard />,
        children: [
            {
                // RouteAccessGuard redirects to the default view on routes whose
                // handle.requiresAccess rule the current user's role fails.
                element: <RouteAccessGuard />,
                children: appRoutes,
            },
        ],
    },
];
