// Ember stores the URL a signed-out user tried to visit under this
// sessionStorage key (see ghost/admin/app/routes/authenticated.js) and
// redirects back to it after signin (see ghost/admin/app/services/session.js).
// The React auth screens share the key so both shells stay interchangeable.
export const SIGNIN_REDIRECT_KEY = "ghost-signin-redirect";

export function storeSigninRedirect(url: string): void {
    window.sessionStorage.setItem(SIGNIN_REDIRECT_KEY, url);
}

export function consumeSigninRedirect(): string | null {
    const url = window.sessionStorage.getItem(SIGNIN_REDIRECT_KEY);
    window.sessionStorage.removeItem(SIGNIN_REDIRECT_KEY);
    return url;
}

export function clearSigninRedirect(): void {
    window.sessionStorage.removeItem(SIGNIN_REDIRECT_KEY);
}
