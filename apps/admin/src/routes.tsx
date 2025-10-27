import {Outlet, type RouteObject} from "@tryghost/admin-x-framework";
import {routes as postRoutes} from "@tryghost/posts/src/routes";
import GlobalDataProvider from "@tryghost/stats/src/providers/GlobalDataProvider";
import {FeatureFlagsProvider} from "@tryghost/activitypub/src/lib/feature-flags";
import { routes as statsRoutes, APP_ROUTE_PREFIX as statsAppRoutePrefix } from "@tryghost/stats/src/routes";
import { routes as activityPubRoutes } from "@tryghost/activitypub/src/routes";
import { EmberFallback } from "./ember-bridge";

export const routes: RouteObject[] = [
    {
        path: "/",
        element: <div>Hello World</div>
    },
    ...postRoutes[0].children!.filter(route => route.path !== "*"),
    {
        path: `${statsAppRoutePrefix}`,
        element: <GlobalDataProvider><Outlet /></GlobalDataProvider>,
        children: [
            ...(statsRoutes).map(route => ({
                ...route,
                path: `${statsAppRoutePrefix}${route.path ?? ''}`
            }))
        ]
    },
    {
        element: <FeatureFlagsProvider><Outlet /></FeatureFlagsProvider>,
        children: activityPubRoutes
    },
    {
        path: "*",
        Component: EmberFallback
    }
];
