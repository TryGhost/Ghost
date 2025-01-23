/**
 * This is an experimental provider that uses React Router to provide a router
 * context to React apps in Ghost.
 *
 * This is not ready for production yet. For apps in production, use the
 * RoutingProvider.
 */

import {ErrorPage} from '@tryghost/shade';
import React, {useMemo} from 'react';
import {createHashRouter, RouteObject, RouterProvider as ReactRouterProvider} from 'react-router';

export interface RouterProviderProps {
    routes: RouteObject[];
    prefix?: string;

    // Custom routing props
    errorElement?: React.ReactNode;
}

export function RouterProvider({
    routes,
    prefix,
    errorElement
}: RouterProviderProps) {
    const router = useMemo(() => {
        // Ensure prefix has a leading slash and no trailing slash
        const normalizedPrefix = `/${prefix?.replace(/^\/|\/$/g, '')}`;

        // Add default error element if not provided
        const finalRoutes = routes.map(route => ({
            ...route,
            errorElement: route.errorElement || errorElement || <ErrorPage />
        }));

        return createHashRouter(finalRoutes, {
            basename: normalizedPrefix
        });
    }, [routes, prefix, errorElement]);

    return (
        <ReactRouterProvider
            router={router}
        />
    );
}
