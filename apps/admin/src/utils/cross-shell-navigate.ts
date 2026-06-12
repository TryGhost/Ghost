import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";

/**
 * Navigate via a real location hash change instead of a React Router
 * navigation. Router navigations use pushState, which fires no hashchange —
 * when the target route is Ember-owned (its labs flag off) and the hidden
 * Ember app is parked by a route handover, it would never wake and the
 * content area would stay empty. A location-based hash navigation is
 * observed by both routers (popstate + hashchange), so it is safe regardless
 * of which shell owns the target. Same pattern as the auth slice's
 * AuthenticatedRedirect.
 */
export function crossShellNavigate(route: string, { replace = false }: { replace?: boolean } = {}): void {
    const { adminRoot } = getGhostPaths();
    const target = `${adminRoot}#${route}`;

    if (replace) {
        window.location.replace(target);
    } else {
        window.location.assign(target);
    }
}
