import { Outlet, type RouteObject } from "@tryghost/admin-x-framework";
import { routes as postRoutes } from "@tryghost/posts/src/routes";
import GlobalDataProvider from "@tryghost/stats/src/providers/GlobalDataProvider";
import {FeatureFlagsProvider} from "@tryghost/activitypub/src/lib/feature-flags";
import { routes as activityPubRoutes, APP_ROUTE_PREFIX as activityPubAppRoutePrefix } from "@tryghost/activitypub/src/routes";
import { routes as statsRoutes } from "@tryghost/stats/src/routes";
import { EmberFallback } from "./ember-bridge";

export const routes: RouteObject[] = [
    {
        path: "/",
        element: <div>Hello World</div>
    },
    ...postRoutes[0].children!.filter(route => route.path !== "*"),
    {
        element: <GlobalDataProvider><Outlet /></GlobalDataProvider>,
        children: statsRoutes
    },
    {
        element: <FeatureFlagsProvider><Outlet /></FeatureFlagsProvider>,
        children: [
            ...activityPubRoutes.map(route => ({
                ...route,
                path: `${activityPubAppRoutePrefix}${route.path ?? ''}`
            }))
        ]
    },
    {
        path: "*",
        Component: EmberFallback
    }
];