import React, {useCallback, useMemo} from 'react';
import {createHashRouter, RouteObject, RouterProvider as ReactRouterProvider, NavigateOptions as ReactRouterNavigateOptions, useNavigate as useReactRouterNavigate, useLocation, useParams} from 'react-router';
import {useFramework} from './FrameworkProvider';
import {NavigationStackProvider} from './NavigationStackProvider';
import {ErrorPage} from '@tryghost/shade';

/**
 * This provider uses React Router to provide a router context to React apps
 * in Ghost. For future apps this is the preferred router provider
 * (not RoutingProvider).
 */

/**
 * Wrap React Router in a custom provider to provide a standard, simplified
 * interface for all Ghost apps for routing. It also sanitizes the routes and
 * adds a default error element.
 */
export interface RouterProviderProps {
    routes: RouteObject[];
    prefix?: string;

    // Custom routing props
    errorElement?: React.ReactNode;
    children?: React.ReactNode;
}

export function RouterProvider({
    routes,
    prefix,
    errorElement,
    children
}: RouterProviderProps) {
    // Memoize the router to avoid re-creating it on every render
    const router = useMemo(() => {
        // Ensure prefix has a leading slash and no double+ or trailing slashes
        const normalizedPrefix = `/${prefix?.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')}`;

        // Create a root route that wraps all routes with NavigationStackProvider
        // and any additional children (providers) so they have access to routing
        const rootRoute: RouteObject = {
            element: (
                <NavigationStackProvider>
                    {children}
                </NavigationStackProvider>
            ),
            children: routes.map(route => ({
                ...route,
                errorElement: route.errorElement || errorElement || <ErrorPage />
            }))
        };

        return createHashRouter([rootRoute], {
            basename: normalizedPrefix
        });
    }, [routes, prefix, errorElement, children]);

    return (
        <ReactRouterProvider router={router} />
    );
}

/**
 * Override the default navigate function to add the crossApp option. This is
 * used to determine if the navigate should be handled by the custom router, ie.
 * if we need to navigate outside of the current app in Ghost.
 */
interface NavigateOptions extends ReactRouterNavigateOptions {
    crossApp?: boolean;
}

export function useNavigate() {
    const navigate = useReactRouterNavigate();
    const {externalNavigate} = useFramework();

    return useCallback((
        to: string | number,
        options?: NavigateOptions
    ) => {
        if (typeof to === 'number') {
            navigate(to);
            return;
        }

        if (options?.crossApp) {
            externalNavigate({route: to, isExternal: true});
            return;
        }

        navigate(to, options);
    }, [navigate, externalNavigate]);
}

export function useBaseRoute() {
    const location = useLocation();
    return location.pathname.split('/')[1];
}

export function useIsBaseRoute() {
    const params = useParams();
    return params && Object.keys(params).length > 0;
}