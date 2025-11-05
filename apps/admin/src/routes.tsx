import { type RouteObject, Outlet, redirect } from "@tryghost/admin-x-framework";

// ActivityPub
import { FeatureFlagsProvider } from "@tryghost/activitypub/src/lib/feature-flags";
import { routes as activityPubRoutes } from "@tryghost/activitypub/src/routes";

// Posts (aka tags and post analytics)
import PostsAppContextProvider from "@tryghost/posts/src/providers/PostsAppContext";
import { routes as postRoutes } from "@tryghost/posts/src/routes";

// Stats (aka analytics)
import GlobalDataProvider from "@tryghost/stats/src/providers/GlobalDataProvider";
import { routes as statsRoutes } from "@tryghost/stats/src/routes";

import { EmberFallback } from "./ember-bridge";

export const routes: RouteObject[] = [
    {
        // Override the tag detail route from the posts app to ensure we
        // correctly delegate to Ember since we can't remove the blank screen in
        // the posts app. The blank screen needs to be there to prevent the
        // router error fallback from triggering when navigating from the tag
        // list to a tag detail page.
        path: "/tags/:tagSlug",
        Component: EmberFallback,
    },
    {
        element: (
            <PostsAppContextProvider value={{ fromAnalytics: true }}>
                <Outlet />
            </PostsAppContextProvider>
        ),
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
        path: "",
        element: (
            <FeatureFlagsProvider>
                <Outlet />
            </FeatureFlagsProvider>
        ),
        children: activityPubRoutes,
    },
    {
        path: "*",
        Component: EmberFallback,
    },
];
