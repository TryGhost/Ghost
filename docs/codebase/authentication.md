# Authentication

Ghost has three distinct identities that authenticate across its APIs:

- **Staff users** use the Admin API through an Admin session or a Staff Access
  Token.
- **Integrations** use tokens for the Admin API and keys for the Content API.
- **Members** use member sessions for the Members API and member-authenticated
  Content API routes.

These identities do not provide interchangeable access. Authentication proves
which staff user, integration, or member made a request; authorization then
decides whether that identity can use the requested endpoint.

For consumer-facing API instructions, see the public documentation for the
[Admin API](https://docs.ghost.org/admin-api#authentication),
[Content API](https://docs.ghost.org/content-api#key), and
[Staff API](https://docs.ghost.org/staff). This guide explains where those
schemes meet the Ghost codebase.

## Request flow

Admin and Content API requests pass through separate authentication and
authorization middleware:

1. Authentication middleware looks for the credentials accepted by that API
   and attaches the matching identity to the request.
2. Authorization middleware requires an identity where the route is private.
3. Admin routes then apply the permission rules for the staff user or the
   endpoint allowlist for an integration.

Start with:

- [`services/auth/authenticate.js`](../../ghost/core/core/server/services/auth/authenticate.js)
  for the authentication middleware assembled for each API.
- [`services/auth/authorize.js`](../../ghost/core/core/server/services/auth/authorize.js)
  for the identity checks after authentication.
- [`web/api/endpoints/admin/middleware.js`](../../ghost/core/core/server/web/api/endpoints/admin/middleware.js)
  and [`web/api/endpoints/content/middleware.js`](../../ghost/core/core/server/web/api/endpoints/content/middleware.js)
  for the middleware applied to API routes.

## Staff users

### Admin sessions

Admin signs a staff user in with their email and password. Ghost stores the
server-side session in the `sessions` table and sends the browser the
`ghost-admin-api-session` cookie. The cookie is HTTP-only, scoped to the Admin
path, and secure on HTTPS sites.

Creating a session and authenticating later requests are separate steps:

- [`api/endpoints/session.js`](../../ghost/core/core/server/api/endpoints/session.js)
  checks the credentials and begins the session.
- [`services/auth/session/`](../../ghost/core/core/server/services/auth/session/)
  creates, verifies, reads, and destroys Admin sessions.
- [`services/auth/session/express-session.js`](../../ghost/core/core/server/services/auth/session/express-session.js)
  defines the cookie and session store.

Cookie-authenticated requests are protected by origin checks. Do not bypass the
session middleware or reproduce its cookie handling in an endpoint.

### Sign-in verification

By default, a staff user signing in from an unverified session receives a
six-digit code by email and must enter it to complete sign-in. Sites can require
email verification for every sign-in with the `require_email_mfa` setting.
Development and test environments disable staff device verification in their
default configuration.

The verification state belongs to both the session and the staff user. Ghost
rotates the session when signing in and after authentication resets so verified
state cannot be carried to a different user. Verification codes are
session-bound, short-lived, and invalidated after successful use.

The current flow lives in
[`services/auth/session/session-service.js`](../../ghost/core/core/server/services/auth/session/session-service.js),
with request middleware in
[`services/auth/session/middleware.js`](../../ghost/core/core/server/services/auth/session/middleware.js).

### Staff Access Tokens

A staff user can authenticate directly to the Admin API with their unique Staff
Access Token. The client uses the token to sign a short-lived JWT and sends it
with the `Ghost` authorization scheme. The API key record is associated with the
staff user, so normal staff permissions still apply. A small set of sensitive
account-wide operations rejects staff tokens explicitly.

See [Staff Access Token authentication](https://docs.ghost.org/admin-api#staff-access-token-authentication)
for the client contract and
[`services/auth/api-key/admin.js`](../../ghost/core/core/server/services/auth/api-key/admin.js)
for verification.

## Integrations

An integration owns separate Admin and Content API credentials.

### Admin API tokens

Admin API integrations sign a short-lived JWT with their Admin API key and send
it using the `Ghost` authorization scheme. Ghost verifies the signing key,
token lifetime, and API audience before attaching the integration API key to the
request. Integration tokens can access only the endpoint and method combinations
allowlisted in the Admin API middleware.

See [Admin API token authentication](https://docs.ghost.org/admin-api#token-authentication)
and [`services/auth/api-key/admin.js`](../../ghost/core/core/server/services/auth/api-key/admin.js).

### Content API keys

Content API integrations pass their Content API key in the `key` query
parameter. Ghost looks up the matching content-type API key and attaches it to
the request. A Content API key identifies the integration but is not a secret:
it is expected to be used in browsers and other public clients.

See [Content API key authentication](https://docs.ghost.org/content-api#key)
and [`services/auth/api-key/content.js`](../../ghost/core/core/server/services/auth/api-key/content.js).

## Members

Members use passwordless email sign-in. Ghost can send both a magic link and a
one-time verification code. Following the link, or successfully verifying the
code and following its returned redirect, exchanges the single-use token for a
member session.

The browser session is stored in signed member cookies. Ghost uses that session
to load the member and can exchange it for short-lived identity and entitlement
tokens. The Content API accepts a member identity token with the `GhostMembers`
authorization scheme on routes that support member authentication. Members do
not gain access to the Admin API, and staff or integration credentials do not
grant access to member-only routes.

Start with:

- [`web/members/app.js`](../../ghost/core/core/server/web/members/app.js) for the
  Members API routes.
- [`services/members/members-api/`](../../ghost/core/core/server/services/members/members-api/)
  for sending and verifying sign-in tokens.
- [`services/members/members-ssr.js`](../../ghost/core/core/server/services/members/members-ssr.js)
  for member session cookies and identity-token exchange.
- [`services/auth/members/index.js`](../../ghost/core/core/server/services/auth/members/index.js)
  for Content API member-token authentication.

## Changing authentication

Authentication changes cross security and compatibility boundaries. When
changing a flow:

- Keep authentication and authorization separate; successfully parsing a
  credential does not imply access to every route.
- Preserve the distinction between staff, integrations, and members.
- Use the existing session and API-key services instead of handling cookies or
  tokens directly in an endpoint.
- Cover missing, invalid, expired, and wrong-identity credentials as well as the
  successful path.
- Test that a valid credential cannot be used against the wrong API, endpoint,
  staff user, or member session.
- Update the public API documentation when the consumer-facing contract changes.
