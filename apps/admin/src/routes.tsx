import { Outlet, redirect, type RouteObject } from "@tryghost/admin-x-framework";
import { routes as postRoutes } from "@tryghost/posts/src/routes";
import GlobalDataProvider from "@tryghost/stats/src/providers/GlobalDataProvider";
import {FeatureFlagsProvider} from "@tryghost/activitypub/src/lib/feature-flags";
import { routes as statsRoutes, APP_ROUTE_PREFIX as statsAppRoutePrefix } from "@tryghost/stats/src/routes";
import { routes as activityPubRoutes, APP_ROUTE_PREFIX as activityPubAppRoutePrefix } from "@tryghost/activitypub/src/routes";

export const routes: RouteObject[] = [
    {
        path: "/",
        element: <div>Hello World</div>
    },
    ...postRoutes[0].children!,
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
        path: `network`,
        loader: () => redirect(activityPubAppRoutePrefix)
    },
    {
        path: `${activityPubAppRoutePrefix}`,
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
        element: <div>404</div>
    }
];