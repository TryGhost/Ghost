# Auth prototype: new ways to sign in

A clickable, fully mocked prototype of four flows from the "New ways to sign
in flows" canvas: SSO settings, signing in with SSO, setting up an
authenticator app, and signing in with an authenticator app. It is for demos
only.

Nothing is saved to the database and no new API calls are made. All state
lives in the browser (`localStorage['ghost-auth-prototype-state']`), and every
"server" answer is faked in [`fake.ts`](./fake.ts) after a short delay. The
only requests are the reads Admin already makes (current user, site, staff
list).

## Switch it on

Open any Admin URL with `?auth-prototype=on`, for example
`/ghost/#/settings?auth-prototype=on`. It stays on in that browser until you
open a URL with `?auth-prototype=off`. While it is off, Admin is unchanged and
`/ghost/#/auth-demo` is not found.

A **Prototype** button appears at the bottom right. Its panel has presets,
every scenario control, shortcuts to each flow, and **Reset prototype**.

## Fake rules

- Codes: any 6 digits pass except `000000`, which fails.
- Five wrong codes in a row on the sign-in demo pause sign-in for 30 seconds.
  Each pause after that is twice as long (reset with the panel).
- Backup codes are the ten in `fake.ts`. Each works once, compared
  case-insensitively, with the dash optional.
- The SSO connection test uses the panel's "Next test" once; a retry after a
  failure passes, as if the details had been fixed.
- Domain verification works the same way with "Next domain check": a miss
  applies once, then the record is found. The SSO presets start with the
  domains already verified.
- Passwords: anything works.

## Demo script

1. **Settings > Security** (Owner or Administrator), just above Staff. It
   holds Single sign-on and the site-wide two-step rules. Set up SSO, pick
   Okta, fill in anything, Check domains (set "Next domain check" to _Record
   not found yet_ first to see the DNS miss), Test connection, Turn on SSO.
2. Set "Next test" to _Bad secret_ in the panel, then Test again: the test
   fails with `invalid_client`. Try again passes.
3. Switch on **Require SSO for all staff**: the confirmation counts your real
   staff by email domain. Try the _Okta failing_ preset, then Disconnect.
4. The _No SSO on plan_ preset shows the upsell.
5. Under **Two-step verification**, switch on **Require two-step
   verification for all staff**: the confirmation lists staff who haven't
   turned it on (SSO staff aren't affected). While it's on, your own Security
   tab marks it Required and hides Turn off. "Email a code on every sign-in"
   stands in for Ghost's existing switch, which the prototype hides under
   Staff.
6. **Your profile > Security**: turn on the authenticator app, scan, enter a
   code (`000000` shows the wrong-code state), save the backup codes (copy,
   download or print; Finish waits for the checkbox). Then Get new codes and
   Turn off both ask for a code. Each change says we've emailed you.
7. The **Staff** list shows SSO, Two-step and Two-step off badges. Open
   another staff member's profile > Security to see the reset card.
8. **Sign-in demo: SSO user** (`anna@acme.com`): Continue with Okta, the
   provider page, signed in. With Require SSO on there's no password link.
9. **Sign-in demo: owner**: with SSO required, "Sign in with password
   instead" still asks for a code.
10. `new.hire@acme.com`: "You don't have access yet", or "Join" when
    "New people" allows joining (set it in the panel, or tick "Show “New
    people” option in Settings" to show it under Single sign-on).
11. Set "Provider answers" to _Rejects you_ or _Times out_ for those errors.
12. **Sign-in demo: authenticator user** (`sam@freelance.dev`): password,
    code, signed in. A backup code works once. Five wrong codes pause sign-in
    with a countdown and point you to the Owner or an Administrator.
    The _Codes running low_ preset shows the warning after signing in.
13. **What happens after the password** follows Settings > Security:
    - Authenticator app on: the app code.
    - "Require two-step verification" on (the _Two-step required_ preset):
      set up the authenticator app right there, then sign in.
    - Otherwise an emailed code, but only on a new device (panel: "Signing
      in on a new device"), unless "Email a code on every sign-in" is on.
      The owner's way round SSO always asks for one.
    - Known device, no rules: straight in.

## How it hooks in

Everything lives in this folder. Admin imports it only through
[`api.ts`](./api.ts), and every hook into an existing file is marked
`// auth-prototype`:

- `app.tsx`: the floating panel.
- `routes.tsx`: the `/auth-demo/*` routes.
- `settings/routes.tsx`: the `staff/:slug/security` tab route.
- `settings/general/general-settings.tsx`: the Security group (before Staff)
  and its search keywords.
- `settings/layout/sidebar.tsx`: the Security nav item (before Staff).
- `settings/general/users.tsx`: the sign-in method badges, and hiding the
  existing "Require email 2FA codes" switch, which moves to Security.
- `settings/general/user-detail-modal.tsx`: the Security tab.

The demo state is a small external store (`useSyncExternalStore`) rather than
a React context, so it needs no provider in the app tree.

## Remove it

Delete this folder, then remove every line marked `// auth-prototype`:

```bash
grep -rn "auth-prototype" apps/admin/src
```
