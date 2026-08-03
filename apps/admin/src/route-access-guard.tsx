import { Navigate, Outlet, useLocation, useMatches } from "@tryghost/admin-x-framework";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";

type CurrentUser = NonNullable<ReturnType<typeof useCurrentUser>["data"]>;

export type AccessRule = (user: CurrentUser, location: { pathname: string }) => boolean;

export interface AccessRouteHandle {
    requiresAccess?: AccessRule;
}

/**
 * Guard component that keeps staff users out of routes their role can't use.
 *
 * Routes opt in by setting `handle: { requiresAccess: <predicate> }`. A route
 * with no rule is unguarded, so the current user is only awaited on routes that
 * declare one. Denied users are sent to the home route, which resolves the
 * landing view per role.
 *
 * @example
 * ```tsx
 * // In routes.tsx
 * {
 *     path: "/tags",
 *     handle: { requiresAccess: canManageTags } satisfies AccessRouteHandle,
 *     lazy: lazyComponent(() => import("./tags/tags"))
 * }
 * ```
 */
export function RouteAccessGuard() {
    const { data: currentUser, isError, isLoading } = useCurrentUser();
    const location = useLocation();
    const matches = useMatches();

    const rules = matches
        .map(match => (match.handle as AccessRouteHandle | undefined)?.requiresAccess)
        .filter((rule): rule is AccessRule => typeof rule === "function");

    if (rules.length === 0) {
        return <Outlet />;
    }

    if (!currentUser) {
        if (isError || !isLoading) {
            return <Navigate to="/" crossApp />;
        }

        return null;
    }

    if (!rules.every(rule => rule(currentUser, location))) {
        return <Navigate to="/" crossApp />;
    }

    return <Outlet />;
}
