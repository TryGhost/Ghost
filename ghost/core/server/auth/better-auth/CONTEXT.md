# Better Auth

Better Auth covers how staff users sign in, stay signed in and keep a password
when a site runs the Better Auth engine, and the parts of that the legacy
engine shares. How it is built is in the [README](README.md).

## Language

### Engines

**Auth engine**:
The implementation that handles staff sign-in and sessions for a site: `legacy`
or `better-auth`. A site runs one, set in config and fixed until Ghost restarts.
_Avoid_: auth mode, auth backend, auth provider

**Legacy engine**:
Ghost's original staff authentication, the default.
_Avoid_: old auth, classic auth

**Better Auth engine**:
Staff authentication handled by the instance. It needs MySQL.
_Avoid_: new auth, BA

**Instance**:
The one Better Auth object Ghost builds at boot under the Better Auth engine,
with Ghost's options and plugins. Its plugins are fixed once it is built.
_Avoid_: auth server, auth client, auth service

**Ghost plugin**:
A plugin Ghost wrote for the instance, named with a `ghost` prefix, as opposed
to one Better Auth ships.
_Avoid_: custom plugin, extension

**Server-only endpoint**:
An endpoint on the instance that Ghost's own code can call and no HTTP request
can reach.
_Avoid_: internal endpoint, private route

### Routes

**Native route**:
A route Better Auth itself serves, under `/auth/` on the Admin API.
_Avoid_: auth route, Better Auth API

**Compatibility route**:
An Admin API route from before Better Auth, such as `POST /session`, that keeps
its legacy request and response while the Better Auth engine does the work.
_Avoid_: legacy route, shim, proxy route

### Sessions

**Session**:
A staff user's signed-in state under the Better Auth engine. It lasts a fixed
time from sign-in and is never extended.
_Avoid_: login, staff token

**Legacy session**:
A staff user's signed-in state under the legacy engine. The Better Auth engine
never reads one, so switching engines signs everyone out once.
_Avoid_: old session, Express session

**Session token**:
The secret that identifies a session. Ghost sends it only in the session
cookie and never in a response body, though a native route such as
`/auth/revoke-session` accepts one in its request body. Ghost's own calls to
the instance can get it back, so their results are as sensitive as the cookie.
_Avoid_: session id, which is not secret

**Session cookie**:
The cookie that carries the session token. Both engines use the same cookie
name, except that under the Better Auth engine it takes a `__Secure-` prefix
when the admin URL is HTTPS.

**Admin origin**:
The origin of the site's configured admin URL.
_Avoid_: admin host, admin domain

**Session origin**:
The origin a session was created from. A session works only from that origin,
which must be the admin origin. A request with a session that has none resolves
to the anonymous principal.
_Avoid_: referrer, session host

**Verified session**:
A session that has passed device verification, or didn't need it. Only a
verified session signs a request in.
_Avoid_: trusted session, full session

**Unverified session**:
A session from a password sign-in that is still waiting for its code. It can
ask for a code, submit one, or sign out; everywhere else a request with it
resolves to the anonymous principal.
_Avoid_: pending session, partial session, 2FA session

**Rotation**:
Replacing a session with a new one for the same browser. The new session keeps
the old one's origin and stays verified if the old one was.
_Avoid_: refresh, renewal

**Revocation**:
Ending sessions before they expire.
_Avoid_: invalidation, logout, expiry

**Security event**:
A change that revokes sessions: a password change, a password reset, suspending,
locking or deleting a user, and an authentication reset.

**Authentication reset**:
The site-wide emergency action that ends every staff session under either
engine, replaces every staff user's password and every API key's secret, and
locks every staff user who isn't suspended.
_Avoid_: password reset, session reset

### Device verification

**Device verification**:
Asking for an emailed code when a password sign-in comes from a browser that
has no device trust for that user, except on a user's first sign-in. It is on
when the `security:staffDeviceVerification` config is.
_Avoid_: 2FA, MFA, two-factor (which means authenticator apps)

**Code**:
The six digits emailed for device verification. A code verifies one session
and expires after a few minutes.
_Avoid_: token, OTP, PIN

**Device trust**:
A browser's record that a user verified a session there. Later password
sign-ins from that browser skip device verification until it expires.
_Avoid_: remembered device, trusted device

**Required email verification**:
The site setting (`require_email_mfa`) that asks for a code on every password
sign-in after a user's first. With it on, no browser gets device trust.
_Avoid_: email 2FA, forced MFA

**Passwordless sign-in**:
Signing in without a password. The session is verified from the start, and
required email verification doesn't apply. Only the SSO adapter signs anyone
in this way today.
_Avoid_: social login

### Staff status

**Active**:
A staff user who can sign in. Stored as the status `active` or one of the
`warn-*` statuses.

**Suspended**:
A staff user who can't sign in at all, or reset their password. Stored as the
status `inactive`, which also marks the Owner until setup is finished.
_Avoid_: inactive, disabled, banned

**Locked**:
A staff user who must reset their password before signing in with one. A
passwordless sign-in also makes them active again.
_Avoid_: suspended, blocked

### Passwords

**Credential row**:
The one place a staff user's current password hash is kept. Both engines read
and write it, so a password set under one works under the other. A user
without one has no password.
_Avoid_: credential account, password record

**Password change**:
A signed-in user replacing their password after giving the current one.

**Password reset**:
Replacing a password through an emailed link, without the current one.
_Avoid_: password recovery, authentication reset

### SSO

**SSO adapter**:
Ghost's existing hook that lets an outside system, such as Ghost(Pro) support
access, sign in as a staff user. It works under either engine.
_Avoid_: SSO plugin, SSO provider

**SSO session**:
A verified session created for the user the SSO adapter resolved.

### Mapping onto Ghost's tables

**Virtual column**:
A field Better Auth expects on a user that Ghost doesn't store. Ghost answers
it from a fixed rule, and writes to it are dropped.
_Avoid_: computed field, fake column

**Create default**:
A value Ghost fills in for a column Better Auth never sets when it creates a
user.

## Not this

- **Principal**, **anonymous**, **scopes** and permissions are defined in
  [Authentication and Authorization](../CONTEXT.md). Better Auth ends where a
  session becomes a principal.
- **Active** and **Suspended** here are staff statuses. An installation's are
  defined in [App Installations](../../services/app-installations/CONTEXT.md),
  and so is an **app session**, which is not a session here.
- Magic links, passkeys and **Team SSO** (staff signing in through their own
  organization's identity provider) aren't built yet. Plain "SSO" means the
  SSO adapter.
- **Members** sign in to a site through Portal with their own tokens. Nothing
  here covers them, and "user" here always means a staff user.
- **Two-factor** means authenticator apps and backup codes, which aren't
  enabled yet. Device verification is not two-factor.
- The `verifications` table holds more than device verification codes, so a
  verification row is not a device verification.
