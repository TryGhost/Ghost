import { Navigate, Outlet, useLocation } from "@tryghost/admin-x-framework";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { EmberFallback } from "@/ember-bridge";
import { isAuthPath } from "./auth-paths";
import { storeSigninRedirect } from "./signin-redirect";

/**
 * Top-level branch for signed-out users (rendered by App when there is no
 * current user).
 *
 * - On an auth path it renders the router outlet so the React auth screens
 *   (or their Ember fallbacks, when authX is off) can render.
 * - On any other path with authX enabled it stores the attempted URL (Ember
 *   parity: the 'ghost-signin-redirect' sessionStorage key) and redirects to
 *   the signin screen.
 * - On any other path with authX disabled it renders the Ember fallback,
 *   exactly as before this guard existed — Ember handles the redirect.
 */
export function UnauthenticatedApp({ isCurrentUserLoading }: { isCurrentUserLoading: boolean }) {
    const location = useLocation();
    const { data: siteData, isLoading: isSiteLoading } = useBrowseSite();

    if (isAuthPath(location.pathname)) {
        return <Outlet />;
    }

    // Wait until we know whether the user is really signed out and whether
    // the flag is on; redirecting (or revealing Ember) early would be wrong
    // for signed-in users whose /users/me request is still in flight.
    if (isCurrentUserLoading || (!siteData && isSiteLoading)) {
        return null;
    }

    if (!siteData?.site.authX) {
        return <EmberFallback />;
    }

    // Render-phase side effect, but an idempotent one: the attempted URL for
    // this location is the same on every render pass.
    storeSigninRedirect(location.pathname + location.search);

    return <Navigate replace to="/signin" />;
}
