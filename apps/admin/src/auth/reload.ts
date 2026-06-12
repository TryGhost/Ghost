import { getGhostPaths } from "@tryghost/admin-x-framework/helpers";
import { clearSigninRedirect } from "./signin-redirect";

/**
 * Performs a full page load of the admin at the given (hash) route.
 *
 * The auth screens always reload after the session state changes: the hidden
 * Ember app must boot with the new session so the screens that still live in
 * Ember (e.g. the editor) work, and a reload is the simplest way to reset
 * both shells consistently.
 */
export function reloadAdmin(route: string = "/"): void {
    const { adminRoot } = getGhostPaths();
    const target = `${adminRoot}#${route}`;
    const current = window.location.pathname + window.location.search + window.location.hash;

    if (current === target) {
        // already there — replace() with an identical URL won't reload
        window.location.reload();
    } else {
        // a path change reloads on its own; for hash-only changes the
        // 'hashchange' full reload is forced by reload() in the load handler
        // — but firing reload() synchronously after replace() races the two
        // navigations, so only replace() here and reload when the hash-only
        // change has been applied
        window.location.replace(target);
        if (new URL(target, window.location.origin).pathname === window.location.pathname) {
            // hash-only change: replace() updated the URL synchronously
            // without a document load — force one
            window.location.reload();
        }
    }
}

/**
 * Boots the admin after a successful authentication (session created via
 * signin, signup or password reset).
 *
 * The stored signin deep link ('ghost-signin-redirect') is deliberately NOT
 * consumed here: the page reloads in place and the auth gate consumes the key
 * client-side after boot (and Ember's session service consumes the same key
 * when it owns the screens). Navigating and reloading in one synchronous
 * sequence raced the two navigations and could drop the hash entirely.
 */
export function bootstrapAdminAfterAuth(): void {
    window.location.reload();
}

/**
 * Reload into the signed-out state (after signout).
 */
export function reloadAdminToSignin(): void {
    clearSigninRedirect();
    reloadAdmin("/signin");
}
