import { useEffect, useState, type ComponentType } from "react";
import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { useCurrentUser } from "@tryghost/admin-x-framework/api/current-user";
import { useBrowseSite } from "@tryghost/admin-x-framework/api/site";
import { EmberFallback } from "@/ember-bridge";
import { isAuthPath } from "./auth-paths";
import { SIGNIN_REDIRECT_KEY, clearSigninRedirect } from "./signin-redirect";

/**
 * An authenticated user on an auth screen gets bounced to the deep link they
 * originally tried to visit (stored by UnauthenticatedApp before redirecting
 * to signin — the post-login reload lands back on the auth screen and this
 * redirect completes the round trip), or home. The target is captured once in
 * state: the effect clears the key, so re-reading sessionStorage on a later
 * render (query refetches re-render the gate before the redirect lands)
 * would lose the deep link and bounce home instead.
 *
 * The redirect is a real location-based hash navigation, not a React Router
 * <Navigate>: router redirects use pushState, which fires no hashchange, so
 * the hidden Ember app — parked on the auth screen by its gated
 * unauthenticated routes — would never wake up for Ember-owned targets and
 * the content area would stay empty.
 */
function AuthenticatedRedirect() {
    const [target] = useState(() => {
        const stored = window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY);
        return stored && !isAuthPath(stored) ? stored : "/";
    });

    useEffect(() => {
        clearSigninRedirect();
        const { adminRoot } = getGhostPaths();
        window.location.replace(`${adminRoot}#${target}`);
    }, [target]);

    return null;
}

/**
 * Renders a React auth screen when the authX labs flag is enabled, and falls
 * back to the Ember admin when it is not.
 *
 * Unlike FlagGatedRoute this reads the flag from the public site endpoint
 * (site.authX) rather than the authenticated config endpoint, because the
 * auth screens render before a session exists.
 *
 * While the site or current user are loading we render nothing: mounting
 * EmberFallback eagerly would flash the Ember screen before the React
 * implementation takes over.
 */
export function AuthFlagGatedRoute({ component: Component, allowAuthenticated = false }: {
    component: ComponentType;
    /** Set for screens that signed-in users may visit (e.g. signout). */
    allowAuthenticated?: boolean;
}) {
    const { data: siteData, isLoading: isSiteLoading } = useBrowseSite();
    const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentUser();

    if ((!siteData && isSiteLoading) || (!currentUser && isCurrentUserLoading)) {
        return null;
    }

    if (!siteData?.site.authX) {
        return <EmberFallback />;
    }

    if (currentUser && !allowAuthenticated) {
        // Mirror Ember's UnauthenticatedRoute: signed-in users get bounced to
        // their stored deep link (completing a post-signin round trip) or home
        return <AuthenticatedRedirect />;
    }

    return <Component />;
}
