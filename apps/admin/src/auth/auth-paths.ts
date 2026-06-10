// Routes rendered by the React auth screens (when the authX flag is on).
// /signup and /reset carry a token segment.
const AUTH_PATH_PATTERNS = [
    /^\/signin\/?$/,
    /^\/signin\/verify\/?$/,
    /^\/signout\/?$/,
    /^\/signup(\/|$)/,
    /^\/reset(\/|$)/,
    /^\/setup\/?$/,
];

export function isAuthPath(pathname: string): boolean {
    // /setup/onboarding is a post-signin React screen, not an auth screen
    if (pathname.startsWith("/setup/onboarding")) {
        return false;
    }

    return AUTH_PATH_PATTERNS.some(pattern => pattern.test(pathname));
}
