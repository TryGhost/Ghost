import { Navigate, Outlet, useMatches } from "@tryghost/admin-x-framework";
import { useForceUpgrade } from "./ember-bridge";

export interface RouteHandle {
    allowInForceUpgrade?: boolean;
}

/**
 * Guard component that redirects to /pro when site is in force upgrade mode.
 *
 * Routes can opt-out of being blocked by setting `handle: { allowInForceUpgrade: true }`
 * in their route definition. This is used for routes that should remain accessible
 * during force upgrade (e.g., /pro itself, /settings, /signout).
 *
 * When forceUpgrade is active:
 * - Routes with allowInForceUpgrade: true render normally
 * - All other routes redirect to /pro (billing page)
 *
 * @example
 * ```tsx
 * // In routes.tsx
 * {
 *     path: "settings/*",
 *     element: <Settings />,
 *     handle: { allowInForceUpgrade: true }
 * }
 * ```
 */
export function ForceUpgradeGuard() {
    const forceUpgrade = useForceUpgrade();
    const matches = useMatches();

    // Check if any matched route allows access in force upgrade mode
    const isAllowed = matches.some((match) => {
        const handle = match.handle as RouteHandle | undefined;
        return handle?.allowInForceUpgrade === true;
    });

    if (forceUpgrade && !isAllowed) {
        return <Navigate to="/pro" replace />;
    }

    return <Outlet />;
}
