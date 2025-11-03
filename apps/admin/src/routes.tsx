import { Outlet, type RouteObject, redirect } from "@tryghost/admin-x-framework";
import { routes as postRoutes } from "@tryghost/posts/src/routes";
import GlobalDataProvider from "@tryghost/stats/src/providers/GlobalDataProvider";
import {FeatureFlagsProvider} from "@tryghost/activitypub/src/lib/feature-flags";
import { routes as activityPubRoutes } from "@tryghost/activitypub/src/routes";
import { routes as statsRoutes } from "@tryghost/stats/src/routes";
import { EmberFallback } from "./ember-bridge";

export const routes: RouteObject[] = [
    {
        // Override the blank tag detail route in the post app to ensure we
        // display the Ember screen. Without this the posts app renders a blank
        // screen. This is needed when running the posts app within Ember as it
        // prevents the error fallback route screen from showing.
        path: "/tags/:tagSlug",
        Component: EmberFallback
    },
    ...postRoutes[0].children!.filter(route => route.path !== "*"),
    {
        element: <GlobalDataProvider><Outlet /></GlobalDataProvider>,
        children: statsRoutes
    },
    {
        path: `network`,
        loader: () => redirect('/activitypub')
    },
    {
        path: '',
        element: <FeatureFlagsProvider><Outlet /></FeatureFlagsProvider>,
        children: activityPubRoutes
    },
    {
        path: "*",
        Component: EmberFallback
    }
];