import { Outlet, type RouteObject } from "@tryghost/admin-x-framework";
import { routes as postRoutes } from "@tryghost/posts/src/routes";
import GlobalDataProvider from "@tryghost/stats/src/providers/GlobalDataProvider";
import { routes as statsRoutes, APP_ROUTE_PREFIX } from "@tryghost/stats/src/routes";
//import { routes as activityPubRoutes } from "@tryghost/admin-x-activitypub/src/routes";
import EmberFallback from "./ember-bridge/EmberFallback";

export const routes: RouteObject[] = [
    {
        path: "/",
        element: <div>Hello World</div>
    },
    ...(postRoutes as RouteObject[])[0].children!.filter(route => route.path !== "*"),
    {
        path: `${APP_ROUTE_PREFIX}`,
        element: <GlobalDataProvider><Outlet /></GlobalDataProvider>,
        children: [
            ...(statsRoutes as RouteObject[]).map(route => ({
                ...route,
                path: `${APP_ROUTE_PREFIX}${route.path ?? ''}`
            }))
        ]
    },
    //...activityPubRoutes,
    {
        path: "*",
        Component: EmberFallback
    }
];