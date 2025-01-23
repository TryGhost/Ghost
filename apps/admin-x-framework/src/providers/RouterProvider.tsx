import {ErrorPage} from '@tryghost/shade';
import React, {useMemo} from 'react';
import {createHashRouter, RouteObject, RouterProvider as ReactRouterProvider} from 'react-router';

/**
 * READ THIS BEFORE USING THIS PROVIDER
 *
 * This is an experimental provider that tests using React Router to provide
 * a router context to React apps in Ghost.
 *
 * It is not ready for production yet. For apps in production, use the custom
 * RoutingProvider.
 */

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
    // Memoize the router to avoid re-creating it on every render
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
