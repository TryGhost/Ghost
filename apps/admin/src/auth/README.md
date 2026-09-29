# Auth screens

Sign in, sign-in verification, password reset, staff invite signup, first-run
setup and sign out, served at `/signin`, `/signin/verify`, `/reset/:token`,
`/signup/:token`, `/setup` and `/signout`.

## Who serves them

The screens render before anyone is signed in, so the authenticated `/config/`
Labs payload is unavailable. `useAuthScreensOwner` decides from inputs that are
public: the `authReact` field of `GET /site/`, or an `authReact` Labs URL
override (`/ghost/#/signin?labs=authReact`). A server without the field serves
the Ember screens. The answer is held for the page's lifetime.

When React owns them, a signed-out visitor gets `SignedOutApp` in place of the
admin shell: auth routes render, any other route is remembered and replaced by
`/signin`, and a site that has not been set up sends every auth screen except
sign out to `/setup`. A signed-in visitor on an auth route goes home (with a
warning on reset and signup), except `/signout`.

## The client contract

Screens call `useAuthClient()` and the read hooks from `client/auth-client.ts`
and nothing else. The contract follows the BetterAuth client:

- calls resolve to `{data, error}`; a request that reached the server never
  throws, while a transport failure (and the global upgrade/maintenance states)
  does;
- `error.code` is set only where a screen branches on it
  (`USER_NOT_FOUND`, `INVALID_PASSWORD`, `PASSWORD_RESET_REQUIRED`,
  `INVALID_CODE`); `error.message` is the text to show;
- sign in reports a required emailed code as data
  (`{twoFactorRedirect: true}`), with Ghost's reason as an extension field;
- `invitation`, `setup`, `useSetupStatus`, `useInvitation` and
  `getResetTokenEmail` are Ghost extensions.

`client/ghost-auth-client.ts` implements it over Ghost's session and
authentication endpoints (through the framework hooks, which never retry these
single-use writes). Replacing the implementation means exporting a different
`useAuthClient` from `client/auth-client.ts`. Two server behaviours the screens
rely on and a replacement must keep: the first verification code is emailed
during sign in (the verify screen only calls `sendOtp` from Resend), and a
password reset may or may not sign the user in (the screen reloads either way,
landing on the admin or on sign in).

## Session changes reload the page

Every successful sign in, verification, reset, signup and setup, and every
sign out, ends in `reloadAdmin()`: the admin still boots a hidden Ember app
for the screens it serves, and it has to boot with the new session. The
reload lands directly on the destination: the route remembered in
`sessionStorage['ghost-signin-redirect']` (written by whichever shell sent the
visitor to sign in), `/` for role-based landing, `/?firstStart=true` after
setup, or `/signin` after signing out. A password reset leaves its confirmation
in `sessionStorage` for the reloaded admin to show.

## Tests

Acceptance specs boot signed out with `renderAdminApp(route, signedOut({authReact: true}))`
and fake `/authentication/setup/` with `fakeSetupStatus()`; `reloadAdmin` is
mocked. Signed-in specs live in their own file: once a page load has seen the
session work, a later 403 would trigger the session-expiry redirect.
