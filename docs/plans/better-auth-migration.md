# Better Auth migration plan

Status: Phases 0 and 1 done; Phase 2 next. Findings and settled decisions are
in the [Better Auth README](../../ghost/core/server/auth/better-auth/README.md#phase-0-findings).

This plan moves Ghost's staff authentication onto
[Better Auth](https://www.better-auth.com) without changing the wire contract of
anything that exists today:

- Admin sessions (email + password, `ghost-admin-api-session` cookie)
- Sign-in verification by six-digit email code (new-device check and the
  `require_email_mfa` setting)
- Admin API keys (`Authorization: Ghost` JWTs) and Staff Access Tokens
- Content API keys (`?key=`)
- Password reset, first-run setup, invitations, the danger-zone
  authentication reset, and the SSO adapter hook used by Ghost(Pro) support
  access

Once it is done, new credential types (authenticator apps, passkeys, magic
links, OIDC/SAML, scoped Bearer tokens, OAuth clients, session management) are
Better Auth plugins sharing one adapter, one hook pipeline and one principal
model, instead of new bespoke middleware.

It follows these principles: off-the-shelf before bespoke, standard API
conventions (Bearer credentials, personal access tokens, OAuth clients), least
privilege, one authorisation model (roles grant permissions, scopes narrow a
token, a user token's access is the intersection), and legacy cleanup in major
versions. Read the [authentication guide](../codebase/authentication.md) for
current behaviour.

## Contents

1. [Approach](#1-approach)
2. [Constraints from the current code](#2-constraints-from-the-current-code)
3. [Target architecture](#3-target-architecture)
4. [Data model](#4-data-model)
5. [Compatibility contract](#5-compatibility-contract)
6. [Phases](#6-phases)
7. [Testing](#7-testing)
8. [Rollout and rollback](#8-rollout-and-rollback)
9. [Risks](#9-risks)
10. [Decisions](#10-decisions)
11. [Out of scope and later extensions](#11-out-of-scope-and-later-extensions)
12. [File map](#12-file-map)

## 1. Approach

**Expand, migrate, contract.**

- **Expand (Phase 1).** Better Auth is built and backed by its own tables
  behind the `auth:engine` config switch, with no user-visible change. Its
  handler is mounted under `better-auth`, with the hook that strips session
  tokens from its responses (§10).
- **Migrate (Phases 2–8).** Under `auth:engine = better-auth`, Better Auth owns
  the staff session and email-code verification first; scoped Bearer tokens
  and new sign-in methods (magic link, then passkeys and authenticator apps)
  build on that session directly, with no bridge to the legacy session.
  Passwords and reset, then legacy API keys, follow. Compatibility controllers
  keep existing routes, bodies, cookie name and error codes. Staff sign in
  again once at cutover; leadership has agreed this is not a breaking change
  (breaking integrations or API keys is).
- **Contract (Phases 9–11).** Ghost 7.0 removes the legacy session stack.
  `Authorization: Ghost`, Staff Access Tokens and Content API keys stay through
  7.x, are deprecated during 7.x and are removed in 8.0.

Design rules:

- **Ghost's database, Better Auth's shapes.** A Knex adapter on Ghost's
  existing connection, with ObjectId keys and `snake_case` columns. Better Auth
  data lives in **new tables that follow Better Auth's schema**, started as
  in-development tables; existing tables are not altered during the migration
  (§4). Better Auth runs on MySQL only; SQLite installs stay on the legacy
  engine until 7.0 removes SQLite. The migration that graduates
  `user_accounts` runs on SQLite too, since the legacy engine then keeps
  passwords there (§4.5).
- **Ghost-specific behaviour is Better Auth plugins**, not forks: email-code
  verification, legacy API keys, staff lifecycle (status, setup, invitations)
  and the SSO adapter. Everything else comes from Better Auth's own
  plugins (`magicLink`, `passkey`, `twoFactor`, `apiKey`, `sso`,
  `oauthProvider`). Not `bearer`: the session token stays in its httpOnly
  cookie, and is stripped from native responses (§10).
- **Authorization stays in Ghost.** `canThis`, the code-defined role grants and
  model `permissible` hooks are unchanged. Every credential resolves to one
  `Principal`, from which `frame.options.context` is derived; token policy
  (scopes, staff-token blocklist, integration allowlist) sits at that seam.
- **Wire contracts are preserved** for older Admin builds (Admin and Core
  deploy independently), the comments moderation iframe, integrations and the
  Admin API SDK.

## 2. Constraints from the current code

Paths are relative to `ghost/core/server` unless stated. Auth code lives in
`auth/`.

**Sessions.** `express-session` with a Bookshelf store
(`auth/session/express-session.js`, `session-store.js`, `models/session.js`).
Cookie `ghost-admin-api-session`: `httpOnly`, path `<subdir>/ghost`, 180-day
`maxAge` (`admin:sessionMaxAgeMs`), `sameSite: 'none'` + `secure` on HTTPS,
`lax` otherwise, signed with the `admin_session_secret` setting. The `sessions`
table stores `session_id`, `user_id` and a 2000-character `session_data` blob
(`origin`, `user_agent`, `ip`, `verified`, verification challenge); expiry is
cookie-only and rows are never purged.

- CSRF protection is origin pinning: the request origin must equal the admin
  origin and the origin stored on the session. Session creation asserts the
  admin origin (`assertRequestFromAdminOrigin`).
  `res.locals.bypassCsrfProtection` is the escape hatch.
- **An unverified session is anonymous**: `req.user` stays unset and
  `authorizeAdminApi` returns 403 `Authorization failed`, which Admin reads as
  "signed out".
- Password change destroys the user's other sessions and rotates and
  re-verifies the current one. The danger-zone reset
  (`auth/reset-authentication.ts`) truncates the table.
- The SSO hook (`auth/session/session-from-token.ts`, mounted on `/ghost` in
  `web/parent/backend.js`) turns a credential into a verified session through
  the `@tryghost/adapter-base-sso` contract. Ghost(Pro) support access
  implements it.

**Email-code verification.** Applies to every staff user, not per-user opt-in.
The code is a TOTP over `admin_session_secret + user_id + challenge`
(`auth/totp.ts`), valid 5 minutes, single use. Verified state lives on the
session and survives logout unless `require_email_mfa` is on, so the browser is
the trusted device. First-ever login skips it; `security:staffDeviceVerification`
(false in dev and test) disables it. Contract: 403 with `code`
`2FA_TOKEN_REQUIRED` or `2FA_NEW_DEVICE_DETECTED` and `type` `Needs2FAError`;
`POST /session/verify` sends a code, `PUT /session/verify` checks it (bare 401
on a wrong code); the login body may carry an inline `token`. The email
includes device details and a `get.geojs.io` lookup with a 500 ms timeout.

**Passwords, reset, setup, invitations.** bcrypt in `users.password` via
`@tryghost/security`. `models.User.check()`: `locked` throws
`PasswordResetRequiredError` and sends a reset email, `inactive` is refused,
success updates `last_seen` and sets `active`. Reset tokens are stateless HMACs
with a 24-hour life (`auth/passwordreset.js`). Setup edits the fixture owner
(`auth/setup.js`); invitations validate an `invites` token and create the user
(`services/invites/accept.ts`).

**API keys.** `api_keys` holds `admin` and `content` keys with plaintext
secrets; a row with `user_id` and no `integration_id` is a Staff Access Token.
Admin auth (`auth/api-key/admin.js`) verifies an HS256 JWT signed with the
hex-decoded secret (`kid`, `aud` path match, 5-minute `maxAge`, scheduler
`?token=` exception), so **the secret must stay recoverable**, which rules out
Better Auth's hashed `apiKey` plugin for legacy keys. Content keys are public
lookups. Staff tokens authorise as their user with a blocklist (`DELETE /db`,
`PUT /users/owner`, `POST /authentication/reset`); integrations use an
allowlist (`tokenPermissionCheck` in `web/api/endpoints/admin/middleware.js`).
Any scheme other than `Ghost` is rejected with `INVALID_AUTH_HEADER`, so Bearer
needs an explicit pass-through. Internal keys (`ghost-scheduler`,
`ghost-internal-frontend`) are used in-process via `services/internal-keys`.

**Permissions.** Role grants are code (`services/permissions/permissions-data.ts`,
`role-permissions.ts`); Owner bypasses `canThis`. The `permissions`,
`permissions_roles` and `permissions_users` tables are unused and unseeded and
go in 7.0. `roles`, `roles_users` and `api_keys.role_id` remain.

**Clients.** React Admin (`apps/admin`) owns every auth screen
(`apps/admin/src/auth/`: sign-in, verify, reset, signup, setup, sign-out). The
screens use an `AuthClient` contract shaped like the Better Auth client
(`{data, error}`, codes `USER_NOT_FOUND`, `INVALID_PASSWORD`,
`PASSWORD_RESET_REQUIRED`, `INVALID_CODE`, `twoFactorRedirect` with
`twoFactorReason`), implemented over the legacy endpoints by
`client/ghost-auth-client.ts`; swapping in Better Auth is one module.
`admin-x-framework` treats 403 `Authorization failed` as signed out and probes
`GET /users/me/`. `comments-ui` loads `/ghost/auth-frame`, which Core serves
only when the cookie header contains `ghost-admin-api-session`.

**Platform.** Node `^22.23.5 || ^24.22.3`; Core is TypeScript compiled to
CommonJS; Better Auth 1.7 is ESM-only and loads with `require(esm)`, which
Ghost already relies on. Express 4: Better Auth's `toNodeHandler` must mount before
`body-parser`. MySQL 8 via Knex (Kysely would add a second pool outside Ghost's
transactions). Rate limiting is the `spam` limiters (rate-limiter-flexible on
the `rate_limits` table, `shared.middleware.rateLimiting`) with success resets. Boot owns service initialisation (`kernel/define-service.ts`).

## 3. Target architecture

```text
                          ┌──────────────────────────────────────────────┐
  older Admin builds ───► │  Compatibility controllers (unchanged paths) │
                          │  /session, /session/verify, /authentication/*│──┐ auth.api.*
                          │  /users/:id/token, /integrations/.../refresh │  │ (server-side)
                          └──────────────────────────────────────────────┘  ▼
  React Admin ──────────► ┌──────────────────────────────────────────────┐ ┌────────────────────────┐
  (Better Auth client)    │  Better Auth handler /ghost/api/admin/auth/* │ │ betterAuth() instance  │
                          └──────────────────────────────────────────────┘ │  core: email+password, │
  Bearer tokens, Ghost    ┌──────────────────────────────────────────────┐ │  sessions, verification│
  JWTs, staff tokens, ──► │  resolvePrincipal → req.auth: Principal      │─│  plugins: magicLink,   │
  content keys, cookies   │  → frame.options.context (same shape)        │ │  passkey, twoFactor,   │
                          └──────────────────────────────────────────────┘ │  apiKey, sso, oauth    │
                          ┌──────────────────────────────────────────────┐ │  Ghost plugins (§3.3)  │
                          │  Authorization (unchanged): canThis + token  │ │  adapter: Knex         │
                          │  policy (scopes, blocklist, allowlist)       │ └────────────────────────┘
                          └──────────────────────────────────────────────┘
```

### 3.1 The Better Auth instance

Built once at boot by `auth/better-auth/create-auth.ts` as a boot-owned service
with injected Knex, settings cache, config, URL utils, mailer and i18n. It is
built only when `auth:engine` is `better-auth`. Under `legacy` boot does not
build or validate it. From Phase 2 the legacy engine keeps passwords in
`user_accounts` where the table exists and in `users.password` where it does
not, so legacy boot works without the tables until `user_accounts` graduates
(§4.5).

| Concern               | Setting                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base path             | `basePath` is the subdirectory plus `/ghost/api/admin/auth`, since Ghost mounts at the subdirectory and requests arrive with it; `baseURL` is the origin of `urlUtils.getAdminUrl()` only, since a path there would override `basePath` (tested on a subdirectory install)                                                                                                                              |
| Secret                | `admin_session_secret` setting                                                                                                                                                                                                                                                                                                                                                                          |
| IDs                   | `advanced.database.generateId` returns ObjectIds                                                                                                                                                                                                                                                                                                                                                        |
| Cookie                | `advanced.cookies.session_token` named `ghost-admin-api-session` with today's path, `sameSite`, `httpOnly`; `useSecureCookies` on an HTTPS admin URL adds `Secure` and the `__Secure-` prefix (§5.2)                                                                                                                                                                                                    |
| Session               | `modelName: 'user_sessions'`; `expiresIn` is `admin:sessionMaxAgeMs / 1000` (Better Auth takes seconds, and so does the cookie `maxAge` it derives), with an exact-expiry test; `disableSessionRefresh: true` (absolute expiry, as today); `additionalFields` `verified`, `origin` (`input: false`)                                                                                                     |
| User                  | `modelName: 'users'`; `image` → `profile_image`, timestamps mapped; `emailVerified` virtual (§4.3); `additionalFields` `status`, `slug`, `last_seen` (`input: false`)                                                                                                                                                                                                                                   |
| Account, verification | `user_accounts`, `verifications`                                                                                                                                                                                                                                                                                                                                                                        |
| Email + password      | `disableSignUp: true`; bcrypt `hash`/`verify` via `@tryghost/security`; `sendResetPassword` with Ghost's template; 24-hour reset tokens; `revokeSessionsOnPasswordReset: true`; `onPasswordReset` re-activates locked users                                                                                                                                                                             |
| Origins               | `trustedOrigins` returns the admin origin only, matching today's login-CSRF check (`assertRequestFromAdminOrigin`)                                                                                                                                                                                                                                                                                      |
| Rate limit            | Better Auth's limiter runs on the `spam` limiters through `customStorage`: each native credential route (`/sign-in/email`, `/sign-in/magic-link`, `/request-password-reset`, `/reset-password`, and `/device-verification/*` once added) counts against its compatibility route's limiters, with the same reset on success, so calling the native route cannot bypass them. Other paths are not limited |
| Disabled paths        | `/sign-up/email`, `/update-user`, `/update-session`, `/change-email`, `/delete-user`, social sign-in                                                                                                                                                                                                                                                                                                    |
| Other                 | `telemetry.enabled: false`; logger routed to `@tryghost/logging`; `ipAddressHeaders` aligned with `trust proxy`                                                                                                                                                                                                                                                                                         |

Built-in plugins:

| Plugin          | Package                       | Use                                                                                                                                                                     | Table                 | Phase         |
| --------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------- |
| `apiKey`        | `@better-auth/api-key`        | Personal Access Tokens and site tokens: hashed, scoped, expiring                                                                                                        | `api_tokens`          | 4             |
| `magicLink`     | `better-auth/plugins`         | Staff magic links, `disableSignUp`, Ghost mail                                                                                                                          | `verifications`       | 5             |
| `passkey`       | `@better-auth/passkey`        | WebAuthn; `rpID`/origin from admin URL                                                                                                                                  | `user_passkeys`       | 5 (follow-on) |
| `twoFactor`     | `better-auth/plugins`         | Authenticator app + backup codes, per-user opt-in; not `otpOptions` (Ghost has its own email codes, and OTP enrolment leaves no row for the virtual `twoFactorEnabled`) | `user_two_factors`    | 5 (follow-on) |
| `sso`           | `@better-auth/sso`            | OIDC/SAML for teams                                                                                                                                                     | `sso_providers`       | 8             |
| `oauthProvider` | `@better-auth/oauth-provider` | Installed apps and third-party clients as OAuth clients with scopes                                                                                                     | four `oauth_*` tables | 4b            |

### 3.2 The Knex adapter

`auth/better-auth/knex-adapter.ts`, built with `createAdapterFactory`. It takes
a Knex instance and imports nothing else from Ghost, so it can become a package
or an upstream contribution later (Better Auth has no Knex adapter).

- `supportsJSON: false`, `supportsBooleans: false`, `supportsDates: true`,
  `usePlural: false` (names mapped explicitly), `transaction` via
  `knex.transaction`.
- Implements `create`, `findOne`, `findMany`, `update`, `updateMany`,
  `delete`, `deleteMany`, `count` (plus `consumeOne`/`incrementOne` if they
  help) and translates Better Auth `where` operators and connectors to Knex.
- No `createSchema`: Ghost migrations own DDL.
- Tested with Better Auth's adapter suite (`@better-auth/test-utils/adapter`)
  against MySQL in the database CI lane, plus ObjectId and date cases.
- `create-auth.ts` refuses any `auth:engine` other than `legacy` on SQLite, or
  when the tables it needs do not exist, with one clear boot error.

### 3.3 Ghost plugins

Each is a `BetterAuthPlugin` in `auth/better-auth/plugins/`, with a client
counterpart in `apps/admin-x-framework` where the browser needs one.
Server-only endpoints use `createAuthEndpoint.serverOnly()`. Ghost operations
that make several Better Auth writes open them with `runWithTransaction` from
`@better-auth/core/context`, so `databaseHooks.*.before` hooks run in the
same transaction; `after` hooks run after it commits. Operations that also
write Ghost tables through Bookshelf (`acceptInvitation` consumes the invite
and assigns a role) need both sides in one Knex transaction. Better Auth's
transaction adapter does not expose its `trx`, so this needs a bridge, for
example the Knex adapter exposing the active `trx` or binding Better Auth's
current adapter to a transaction Ghost opened. Spike it before Phase 6,
with a test that a failure on either side rolls back both.
Hook and plugin writes go through `getCurrentAdapter(ctx.context.adapter)`
(exported from `better-auth`): `ctx.context.adapter` itself is outside the
transaction, so a write through it survives a rollback.

There is no session bridge: new sign-in methods arrive after Better Auth owns
the session (Phase 2), so they create a Better Auth session directly.

**`ghostStaffLifecycle`** (Phase 2). Ghost's status rules layered on Better
Auth core.

- `/sign-in/email` does not enumerate staff (§5.3): an unknown email and a
  wrong password are both `INVALID_EMAIL_OR_PASSWORD`. A failed attempt for a
  `locked` user still sends the reset email, without changing the response.
- Before magic-link, passkey and SSO sign-in: refuse `inactive`, and set a
  `locked` user's `status` to `active` (as reset does today). This runs before
  the session is created, so the session guard below admits them.
- After every sign-in: set `last_seen`, set `status` to `active`.
- `databaseHooks.session.create.before`: refuse non-active users on every path.
  It runs after the before-hooks above, so only users still non-active by then
  are refused.
- Server-only: `setupOwner`, `acceptInvitation` (user + credential account +
  role in one transaction), `createVerifiedSession`, `revokeUserSessions`,
  `revokeAllSessions`, `lockAllUsers`.

**`ghostDeviceVerification`** (Phase 3). `twoFactor` and `emailOTP` are per-user
opt-in; Ghost's rule is "every staff user, trusted browser, satisfied by any
stronger factor", so this composes Better Auth's verification store, cookies
and hooks. It is replaced by `twoFactor` if Ghost moves to opt-in 2FA.

- A `session.create.before` hook carries `verified` over when a verified
  session is replaced: `/change-password` with `revokeOtherSessions` and the
  `twoFactor` enable and disable endpoints create a new session for the
  signed-in user, and Better Auth resets additional fields to their defaults.
  Tested for each rotation.
- After any session-creating endpoint, decide `verified`: device verification
  off; first login; magic link, passkey, TOTP or SSO; valid inline `token`; or
  a valid device-trust cookie when `require_email_mfa` is off. Otherwise email
  a code and respond 403 with `2FA_TOKEN_REQUIRED` or
  `2FA_NEW_DEVICE_DETECTED`.
- A global before-hook refuses unverified sessions on every session-protected
  Better Auth endpoint except `/device-verification/*` and `/sign-out`.
  Without it, `/change-password` would accept a session Ghost treats as
  anonymous.
- `POST /device-verification/send` and `/verify`. Codes are 6 random digits,
  stored hashed in `verifications` (`device-verification:<sessionId>`, 5-minute
  expiry). Attempts are an `attempts` field on `verifications`, incremented
  with `incrementOne` guarded by `attempts < 5`, so concurrent wrong codes
  cannot pass the limit; an exhausted code is deleted and a new one must be
  sent. The `spam` limiters still apply on top. Success sets `verified` and, unless
  `require_email_mfa` is on, a signed `ghost-admin-device` cookie bound to the
  user. Sign-out clears it when `require_email_mfa` is on.
- Reuses `auth/session/emails/signin.js` and the device-details helper, with an
  injectable geolocation lookup.

**`ghostApiKeys`** (Phase 7 to Ghost 8.0). Better Auth's `apiKey` cannot host
recoverable signing secrets or integration-bound keys, so this plugin maps the
existing `api_keys` table unchanged and ports today's logic with the same error
codes: `verifyAdminToken`, `verifyContentKey`, `getOrCreateStaffToken`,
`rotateSecret`, `rotateAllSecrets`, `getInternalKey`, using `jose`. It owns
the `api_keys` role rules and the `refreshed` action, contributes the
blocklist and allowlist to the token policy, and adds deprecation headers and
usage counts during 7.x.

**`ghostSso`** (Phase 7). Replaces the `createSessionFromToken()` wiring but
keeps the `@tryghost/adapter-base-sso` contract, so Ghost(Pro) support access
is unchanged; sessions are created through `internalAdapter.createSession`
with `overrideAll`, so `verified` is not reset to its default. Team SSO uses
`@better-auth/sso` instead.

**Token policy** (`auth/policy/`, Phase 4).

- Scopes build on the permission vocabulary from `permissions-data.ts`
  (`object_type:action` or `object_type:*`), so "user permissions ∩ token
  scopes" is a set intersection. Where one permission covers more than one
  capability, a finer scope splits it (for example sending a newsletter is
  `post:edit` today; a token also needs `post:send_newsletter`). The
  permissions engine is unchanged; finer scopes are extra checks at the
  token policy. `scopes.ts` adds the coarse presets the UI offers.
- Scopes apply to everything a request reads, not only its endpoint:
  includes, relations and relation filters (for example
  `posts?include=authors`, or a filter on `tags`) are checked against the
  token's scopes for the related model.
- **Personal Access Tokens** resolve to the user with `method: 'bearer_token'`
  and their scopes; they can only narrow the user's role.
- **Site tokens** are an `apiKey` configuration whose `referenceId` is the
  site or integration; their scopes are their whole authority. They replace
  Admin API integration keys over 7.x.

### 3.4 Principal and request resolution

`auth/principal.ts`:

```ts
type Principal =
  | { kind: 'user'; method: 'session' | 'staff_token' | 'bearer_token' | 'sso'; user: User; session?: Session; apiKey?: ApiKey; scopes?: Scopes }
  | { kind: 'integration'; method: 'admin_api_key' | 'content_api_key'; apiKey: ApiKey; integration: Integration | null; scopes?: Scopes }
  | { kind: 'app'; method: 'oauth_authorization_code' | 'oauth_client_credentials'; app: AppInstallation; actingFor: User | null; scopes: Scopes }
  | { kind: 'internal' }
  | { kind: 'anonymous' };
```

`auth/resolve-principal.ts` replaces `authenticate.js`:

1. `Bearer` → `auth.api.verifyApiKey` (Personal Access Tokens, site tokens),
   else an `oauthProvider` access token (app principal). A session token is
   never accepted as `Bearer`.
2. `Ghost <JWT>` → `verifyAdminToken` (Phase 7; `api-key/admin.js` before
   then). Staff tokens become `kind: 'user'`, `method: 'staff_token'`.
3. Cookie → `auth.api.getSession` → origin pinning → user principal only if
   `verified`, else anonymous.
4. Content API `?key=` → `verifyContentKey`, then the unchanged members
   middleware.

An `app` principal says whether an installed app acts for a user or on its
own. With `actingFor` set (authorization-code grant), its access is the user's
permissions ∩ the app's scopes; without it (client credentials), the scopes
are its whole authority. Audit attribution records the app and, when present,
the user. The shape lands with `resolvePrincipal` in Phase 2, before anything
switches on it, so Phase 4b adds no new kind.

`req.user`, `req.api_key` and `frame.options.context` are derived from
`req.auth`, loading Bookshelf models by id during the transition, so
`authorizeAdminApi`, `canThis`, `permissible` hooks and audit attribution keep
working unchanged.

### 3.5 Mounting

In `web/api/endpoints/admin/app.js`, after the private cache header and
before `bodyParser.json`. The router sets the client IP header from `req.ip`
before Better Auth's limiter reads it:

```js
if (config.get('auth:engine') === 'better-auth') {
  apiApp.use(betterAuthRouter(auth.betterAuth.service));
}
```

Compatibility routes stay in `routes.js` with their rate-limiting
middleware. `mw.authAdminApi` uses `resolvePrincipal` when `auth:engine` is
`better-auth`.

## 4. Data model

### 4.1 New tables, in development first

Better Auth gets its own tables in Better Auth's shape rather than reshaping
Ghost's tables to fit it. This keeps the adapter mapping thin, keeps Better
Auth upgrades (which change plugin schemas) cheap, and avoids nullable-column
migrations and legacy-row filters on live tables.

- Each table is defined in `schema.js` and listed in `IN_DEVELOPMENT_TABLES`
  (`data/schema/in-development.ts`): created only in development and testing,
  outside the integrity hash, free to change.
- A table graduates (removed from the list, versioned migration added) when
  the feature using it first ships to internal Ghost(Pro) sites. Until then,
  code using it stays dormant where the table is absent (§3.2 boot check).
- Existing tables keep their schema: `users` (identity) and `api_keys` (legacy
  keys) are mapped as they are; `sessions` is left to the legacy engine,
  except that revocation deletes a user's rows (Phase 2, step 7), and is
  dropped in 7.0.
- Ghost(Pro) multiplies tables by site count, so migration review is the
  control; give the Pro team a heads-up as tables graduate.

| Table              | Better Auth model | Phase | Notes                                                 |
| ------------------ | ----------------- | ----- | ----------------------------------------------------- |
| `user_accounts`    | `account`         | 1     | Credential row per user now, OIDC/SAML accounts later |
| `verifications`    | `verification`    | 1     | Device codes, magic links, reset tokens               |
| `user_sessions`    | `session`         | 1     | Replaces `sessions` for the new engine                |
| `api_tokens`       | `apikey`          | 4     | Personal Access Tokens and site tokens                |
| `user_passkeys`    | `passkey`         | 5     | Only if passkeys ship                                 |
| `user_two_factors` | `twoFactor`       | 5     | Only if authenticator apps ship                       |
| `sso_providers`    | `ssoProvider`     | 8     | Team SSO                                              |
| `oauth_*` (four)   | `oauthProvider`   | 4b    | Consider Redis secondary storage for token tables     |

Not added: a rate-limit table (`customStorage` runs on the `spam` limiters'
`rate_limits` store), and no reuse of the members `tokens` table for verifications (owned by
members, `varchar(32)` tokens, no expiry). Names use `user_*`, not `staff_*`,
so members could later become Better Auth users without renames.

### 4.2 Column definitions

Columns follow Better Auth's schema for the model, `snake_case`, ObjectId
`id`, `created_at`/`updated_at`. The two core tables:

- `user_accounts`: `user_id` (fk `users.id`, cascade), `account_id`
  (`= user_id` for credentials), `provider_id` (`credential`, later OIDC),
  `password` string(191) nullable, `access_token`/`refresh_token`/`id_token`
  text, `access_token_expires_at`/`refresh_token_expires_at`, `scope`. Unique
  (`provider_id`, `account_id`).
- `user_sessions`: `user_id` (fk, cascade), `token` string(191) unique,
  `expires_at` indexed, `ip_address`, `user_agent`, plus Ghost's `origin` and
  `verified`.
- `verifications`: `identifier` indexed, `value` text, `expires_at` indexed,
  and `attempts` integer default 0 (an `additionalFields` entry, §3.3).

Plugin tables take the plugin's schema as published for the pinned version.

### 4.3 Better Auth fields missing from `users`

Better Auth's user model expects `emailVerified` (and `twoFactorEnabled` with
`twoFactor`). Rather than altering `users`, the adapter's model mapping serves
`emailVerified` as `true` and derives `twoFactorEnabled` from a verified
`user_two_factors` row (the plugin's field is mapped through its `schema`
option, since `user.fields` only renames core fields). Invited staff proved their address by accepting the
invitation, but the owner's address at setup is never verified, so
`emailVerified` is not proof. It is safe only while no enabled flow trusts it:
sign-up is disabled and `requireEmailVerification` is off. Before anything
does (account linking with SSO in Phase 8), store real per-user verification
(§10). The Phase 0 adapter suite found the virtual fields cost only tests that
store `emailVerified: false`, so they stay.

### 4.4 Credential seeding

Each user needs a `credential` row in `user_accounts` with the hash from
`users.password`. While the table is in development a dev/test boot seeder
creates them; on graduation a transactional, idempotent migration in the same
version folder backfills them.

### 4.5 Passwords

bcrypt throughout the migration, via `@tryghost/security`, so hashes are
interchangeable. `user_accounts` becomes the only password store; there is no
dual write:

- In Phase 2, every legacy password read and write moves to `user_accounts`
  wherever the table exists: the user model's hashing and password check,
  reset tokens (`auth/passwordreset.js` signs them with the hash), setup,
  invitation acceptance and the importer. A new legacy user gets a credential
  row in the same transaction. Until graduation that is development and
  testing, where the seeder (§4.4) has already created the rows, so Better
  Auth sign-in sees a password changed through the legacy engine.
- The migration that graduates `user_accounts` (Phase 3) copies every hash
  from `users.password` into a credential row (§4.4), and the legacy code
  then uses `user_accounts` everywhere.
- From then on both engines read and write the same row, so switching
  engines in either direction keeps passwords, and the legacy paths that
  still run under `better-auth` until Phase 6 stay consistent. Tests cover a
  password change through either engine invalidating an outstanding legacy
  reset link.
- `users.password` is no longer read or written, and keeps its `NOT NULL`
  placeholder until 7.0 drops it (§4.7).
- A dual write through `databaseHooks` would need the user worked out per
  path, since `update.before` never sees the update's `where`. If one is ever
  needed, it belongs in the Knex adapter's writes
  ([#32617](https://github.com/TryGhost/Ghost/pull/32617) has one).

After 7.0 drops `users.password`, new hashes use scrypt
with a bcrypt-aware `verify` that rehashes on login.

### 4.6 Cleanup job

A daily job deletes expired `user_sessions` and `verifications` rows; Better
Auth does not purge them.

### 4.7 Removals

- **Ghost 7.0:** drop `sessions` and `users.password`; drop `permissions`,
  `permissions_roles`, `permissions_users`; remove `express-session`,
  `otplib`, and `jsonwebtoken` where `jose`
  replaced it. Decide whether credential rows join content exports.
- **Ghost 8.0:** remove `Authorization: Ghost`, Staff Access Tokens,
  `ghostApiKeys`, the Custom Integrations UI and the `api_keys` table.

## 5. Compatibility contract

Existing tests (§7) must pass unchanged under every engine setting.

### 5.1 HTTP surface

| Route                                                 | Today                                                                                                                                                                                              | New engine                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `POST /session` `{username, password, token?}`        | `201 Created` + cookie; 403 `Needs2FAError` (`2FA_TOKEN_REQUIRED`/`2FA_NEW_DEVICE_DETECTED`); `401 Access Denied.`; 404 unknown email; 422 `PASSWORD_INCORRECT`; `PasswordResetRequiredError`; 429 | `signInEmail` with `returnHeaders`, forwarding `Set-Cookie`                                  |
| `DELETE /session`                                     | `204`                                                                                                                                                                                              | `signOut`                                                                                    |
| `POST /session/verify`                                | `200 OK`                                                                                                                                                                                           | `/device-verification/send`                                                                  |
| `PUT /session/verify` `{token}`                       | `200 OK`, bare `401` on wrong code                                                                                                                                                                 | `/device-verification/verify`                                                                |
| `POST /authentication/password_reset`                 | `Check your email for further instructions.`; suspended refused                                                                                                                                    | `requestPasswordReset`; link stays `<admin>/reset/<token>/`                                  |
| `PUT /authentication/password_reset`                  | `Password updated` + verified session; expired/invalid/corrupt messages                                                                                                                            | `resetPassword` + `createVerifiedSession`; legacy tokens accepted for 24 hours after cutover |
| `/authentication/setup`, `/authentication/invitation` | unchanged                                                                                                                                                                                          | `setupOwner`, `acceptInvitation`                                                             |
| `POST /authentication/reset`                          | `{security_action}`                                                                                                                                                                                | also revokes all sessions and Bearer tokens                                                  |
| `PUT /users/password`                                 | other sessions revoked, own rotated and verified                                                                                                                                                   | `changePassword` with `revokeOtherSessions: true` + `createVerifiedSession`                  |
| `GET/PUT /users/:id/token`, integration key refresh   | unchanged                                                                                                                                                                                          | `getOrCreateStaffToken`, `rotateSecret`                                                      |
| `GET /users/me/`                                      | `200`, or 403 `Authorization failed`                                                                                                                                                               | unchanged; Admin's session probe                                                             |
| `Authorization: Ghost <JWT>`                          | `INVALID_AUTH_HEADER`, `INVALID_JWT`, `MISSING_ADMIN_API_KID`, `UNKNOWN_ADMIN_API_KEY`, `INVALID_API_KEY_TYPE`                                                                                     | through 7.x, removed in 8.0                                                                  |
| `Authorization: Bearer <token>`                       | rejected                                                                                                                                                                                           | Phase 4: 401 `INVALID_BEARER_TOKEN`, 403 on scope violations                                 |
| Content API `?key=`                                   | `UNKNOWN_CONTENT_API_KEY`, `INVALID_API_KEY_TYPE`, `INVALID_REQUEST`                                                                                                                               | unchanged                                                                                    |
| `GET /ghost/auth-frame`                               | served when the cookie header contains `ghost-admin-api-session`                                                                                                                                   | cookie name kept                                                                             |

### 5.2 Cookie

`ghost-admin-api-session` with today's path, `httpOnly` and lifetime, issued
by Better Auth under the new engine. When the admin URL is HTTPS it is
`__Secure-ghost-admin-api-session` (Better Auth's `useSecureCookies`) with
`sameSite: none`, so browsers only accept it over HTTPS; otherwise `lax`.
Today's cookie takes `secure` and `sameSite` from the site URL; this follows
the admin URL, which is where the cookie lives. Not `__Host-`: that needs
`Path=/`, which would send the admin session with every frontend request. The
two engines' values are not interchangeable either way, so the name carries no
compatibility.

### 5.3 Error mapping

Compatibility controllers map Better Auth `APIError`s to `@tryghost/errors`
with today's messages, so older Admin builds keep working:

| Better Auth                              | Ghost error                                                          |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `USER_NOT_FOUND`                         | `NotFoundError` `There is no user with that email address.`          |
| `INVALID_EMAIL_OR_PASSWORD` (known user) | `ValidationError` `PASSWORD_INCORRECT` `Your password is incorrect.` |
| `PASSWORD_RESET_REQUIRED`                | `PasswordResetRequiredError`                                         |
| `ACCOUNT_SUSPENDED`                      | `NoPermissionError` `This account has been suspended.`               |
| `DEVICE_VERIFICATION_REQUIRED`           | `NoPermissionError`, `Needs2FAError`, `2FA_*` code                   |
| `INVALID_TOKEN` / expired                | existing reset-token messages                                        |
| `TOO_MANY_REQUESTS`                      | `TooManyRequestsError`                                               |

The native endpoints emit the codes the React `AuthClient` expects
(`PASSWORD_RESET_REQUIRED`, `INVALID_CODE`, `twoFactorRedirect` +
`twoFactorReason`), except that sign-in does not enumerate staff: an unknown
email, a wrong password and a wrong password on a suspended account are all
Better Auth's `INVALID_EMAIL_OR_PASSWORD`, so `USER_NOT_FOUND` and
`INVALID_PASSWORD` are not used. Suspension and `PASSWORD_RESET_REQUIRED`
only show after a matching password. Today's messages enumerate staff (SC-90);
whether the compatibility controllers keep them is decided with SC-90.

### 5.4 Behaviour

- Unverified sessions are anonymous to the Admin API and Better Auth's
  protected endpoints. First login skips verification, even with
  `require_email_mfa` on, as today (`api/endpoints/session.js` skips it while
  `hasLoggedIn()` is false). Otherwise `require_email_mfa` forces it on
  password sign-in and clears device trust on sign-out; magic
  link, passkey, TOTP and SSO count as verified.
- Origin pinning per session and admin-origin check per request.
- Password change or reset revokes the user's other sessions and keeps the
  current browser verified; authentication reset revokes every session and
  Bearer token; suspending or deleting a user revokes their sessions and
  tokens (today sessions linger).
- Locked users can reset; inactive users cannot sign in or reset.
- Staff-token blocklist, integration allowlist, Bearer scopes capped by role.
- Scheduler URL tokens ignore `maxAge` but honour `exp`/`nbf`.
- `last_seen` and audit attribution (staff token vs Bearer vs integration)
  unchanged.
- Ghost(Pro) support access works in every phase.

## 6. Phases

Every phase ends with `pnpm check` green, the e2e API suite green under each
engine setting it touches, and an update to
[authentication.md](../codebase/authentication.md). Sizes are rough, for one
engineer. Phase 4b (OAuth clients for apps) runs alongside Phase 5. The
Linear project "BetterAuth Migration" covers Phases 0–5 and 4b; Phases
6 and 7 are a follow-on project, and Phase 8 overlaps Berlin's "Permissions
and auth" project.

The Linear project has six weeks, 4 November to 18 December, skipping
Thanksgiving week:

| Milestone | Target | Phases                                                         |
| --------- | ------ | -------------------------------------------------------------- |
| Weeks 1–2 | 13 Nov | 0 and 1 (done 11 Nov)                                          |
| Week 3    | 20 Nov | 2 (started 12 Nov)                                             |
| Week 4    | 4 Dec  | 3, plus Phase 4's spike, scope vocabulary and site-token owner |
| Week 5    | 11 Dec | 4                                                              |
| 4b        | 18 Dec | 4b, across weeks 5 and 6 once Phase 4's token policy lands     |
| Week 6    | 18 Dec | 5, without passkeys and authenticator apps                     |

Sessions, verification and Bearer tokens are the core. Magic link is the first
thing to drop if a phase runs over, and drops before 4b. Passkeys and
authenticator apps move to the follow-on project. Berlin's project starts on
7 December against the agreed scope vocabulary, with the token store landing
in its first week.

### Phase 0: Spikes (S)

1. Adapter: minimal Knex adapter passing Better Auth's adapter suite on MySQL,
   including ObjectIds, dates, booleans, JSON, transactions and the virtual
   `users` fields (§4.3).
2. Confirm APIs and record exact names in `auth/better-auth/README.md`:
   `SERVER_ONLY`, `returnHeaders`, cookie attributes with a path,
   `additionalFields` with `input: false`, `ctx.context.newSession`,
   `internalAdapter.createSession`, `apiKey` custom getter and `permissions`.
3. Confirm §10; move authentication in `direction.md` to "Active migration".

Exit: README notes and a go/no-go.

### Phase 1: Foundations (M)

Better Auth is built and, under `better-auth` only, mounted, with no
user-visible change under `legacy`.

1. Add `better-auth` to the catalog.
2. `knex-adapter.ts` with its adapter-suite test.
3. In-development tables `user_accounts`, `verifications` and
   `user_sessions` with exporter classification and the dev/test credential
   seeder.
4. `create-auth.ts` (§3.1), initialised by boot only when `auth:engine` is
   `better-auth`, refusing to start on SQLite or without its tables.
5. Config `auth:engine` (`legacy` | `better-auth`, default `legacy`); publish
   `auth: {engine}` through `api/endpoints/utils/public-config/config.js`
   (not under `security`); `methods` joins it once it has a config key.
6. Under `better-auth`, mount the handler (§3.5), with Better Auth's limiter
   on the `spam` limiters through `customStorage`, and the after-hook that
   strips session tokens from native responses (§10).

Exit: merged to main; full e2e API suite green under `legacy`.

### Phase 2: Sessions on Better Auth (L)

1. The handler is already mounted under `better-auth` (Phase 1, item 6).
2. Better Auth issues `ghost-admin-api-session` from `user_sessions`; the
   legacy `sessions` table stays in place for rollback (only revocation in
   step 7 deletes from it). Legacy cookies are
   not recognised, so staff sign in again once.
3. `ghostStaffLifecycle` (§3.3).
4. `Principal` and `resolvePrincipal` wired into `mw.authAdminApi`,
   `authAdminApiWithUrl` and the Content API (the `Ghost` branch still calls
   `api-key/admin.js`).
5. Compatibility controllers for `POST`/`DELETE /session`, keeping
   their rate limits and the reset on success.
6. Legacy password reads and writes move to `user_accounts` wherever it
   exists (§4.5), and native `/change-password` is enabled. Until then it is
   disabled, since legacy sign-in would not see its writes.
7. Revocation seams: `changePassword`, user suspension and deletion,
   `reset-authentication.ts` call `revokeUserSessions`/`revokeAllSessions`.
   Until 7.0 drops `sessions`, both also delete the user's legacy `sessions`
   rows, so a rollback (§8) cannot revive a session a security event revoked.
8. `PUT /users/password` and `PUT /authentication/password_reset` use
   `createVerifiedSession`.
9. Cleanup job (§4.6).
10. Run `session`, `session-invalidation`, `users`, `api-tokens`,
    `key-authentication`, `sso` e2e API tests and `e2e/tests/admin/signin.test.ts`
    under both engines with device verification off.

Exit: parity for sign-in, sign-out, expiry, revocation and origin pinning; the
upgrade test (§7) passes.

### Phase 3: Email-code verification, internal cutover (M)

1. `ghostDeviceVerification` (§3.3), including the unverified-session gate and
   device-trust cookie.
2. Compatibility controllers for `/session/verify` and the inline `token`.
3. Move the email template and device-details helper into the plugin; keep the
   subject `<code> is your Ghost sign in verification code`.
4. Run the Staff 2FA block of `session.test.js`, `rate-limiting.test.js` and
   `e2e/tests/admin/two-factor-auth.test.ts` with verification on.
5. Graduate `user_accounts`, `verifications` and `user_sessions` (versioned
   migrations, password copy into `user_accounts`, §4.5), then switch
   internal Ghost(Pro) sites to `better-auth`, telling staff to expect one
   sign-in and one code.

Exit: identical client experience for new-device verification and
`require_email_mfa` on internal sites.

### Phase 4: Bearer tokens with scopes (M)

1. In-development `api_tokens`; `apiKey` plugin reading `Bearer`,
   `enableSessionForAPIKeys` left off, `ghost_pat_` prefix, expiry limits, a
   per-key rate limit, scopes from `auth/policy/scopes.ts`. No `bearer`
   plugin (§10). Agree the scope vocabulary with Berlin before their project
   starts on 7 December.
2. `resolvePrincipal` (and `api-key/admin.js` under `legacy`) passes `Bearer`
   to `verifyApiKey` instead of returning `INVALID_AUTH_HEADER`;
   `tokenPermissionCheck` enforces scopes, including the finer scopes and
   includes/relations (§3.3). A spike before this phase maps where the API
   resolves includes and relation filters, since that check reaches into the
   API layer rather than staying in auth.
3. Reset revokes all tokens; suspension and deletion revoke the user's.
4. Tests: success, missing scope, expired, revoked, role ceiling, audit
   attribution; `key-authentication.test.js` unchanged.

### Phase 4b: OAuth clients for apps (M)

Runs alongside Phase 5, after Phase 4's token policy and scopes.

1. In-development `oauth_*` tables; `@better-auth/oauth-provider` with the
   Phase 4 scope vocabulary, Ghost-styled consent in `apps/admin/src/auth/`,
   and token lifetimes. Decide Redis secondary storage for the token tables
   here (§4.1).
2. Installing an app registers it as an OAuth client; uninstalling revokes
   its client and tokens. Apps get scoped tokens, never a staff session.
3. `resolvePrincipal` maps access tokens to `kind: 'app'` (§3.4):
   authorization-code grants act for the consenting user, client credentials
   act as the app.
4. Tests: consent, scope narrowing, user ∩ app scopes, revocation on
   uninstall and on user suspension, an app token refused where a staff
   session is required, audit attribution.

### Phase 5: New sign-in methods, token UI, Pro cohort (M)

1. `magicLink` with Ghost mail, signing in to a verified Better Auth session,
   surfaced in `apps/admin/src/auth/` through an `AuthClient` addition behind
   the `staffMagicLinks` labs flag.
2. Personal Access Tokens UI in `apps/admin/src/settings/general/users/`
   (name, scopes, expiry, list, revoke, shown once); site tokens in the
   Integrations settings, Administrators only. Document Bearer as the
   recommended Admin API method.
3. Graduate `api_tokens`; run `better-auth` on a Ghost(Pro) cohort.
4. Follow-on project, not the Linear project's week six: `passkey` and
   `twoFactor` with in-development `user_passkeys` and
   `user_two_factors`, enrolment in profile settings and sign-in options
   behind `staffPasskeys` and `staffAuthenticatorApp`.
5. Tests: e2e for each method creating a verified session; browser tests for
   magic link (MailPit) and the token UI.
6. Handoff note for Phases 6 and 7 and for Berlin.

### Phase 6: Passwords, setup, invitations (M)

1. Reset routes on `requestPasswordReset`/`resetPassword`, accepting legacy
   tokens for 24 hours after cutover.
2. `setupOwner` and `acceptInvitation` used by `auth/setup.js` and
   `services/invites/accept.ts`; invitation tokens stay in `invites`.
3. `PasswordResetRequiredError` for locked users, with the automatic email.
4. Run `authentication`, `invites`, `test/legacy/api/admin/authentication`,
   and `e2e/tests/admin/reset-password`, `staff-role-smoke`,
   `settings/danger-zone`.

### Phase 7: Legacy keys as a plugin, SSO, principal everywhere (M)

1. `ghostApiKeys`; `resolvePrincipal` uses `verifyAdminToken`/`verifyContentKey`.
2. Blocklist and allowlist move into `auth/policy/`; `tokenPermissionCheck`
   becomes a thin caller.
3. Staff-token endpoints, integration key refresh, `refreshAllSecrets` and
   `services/internal-keys` go through the plugin.
4. `ghostSso` replaces the `session-from-token.ts` wiring; verify `sso.test.js`
   and a Ghost(Pro) support-access smoke test.
5. Readers of `req.user`, `req.api_key`, `frame.user` and
   `frame.original.session` read the principal.
6. Run `api-tokens`, `key-authentication` (admin and content), `integrations`,
   `test/unit/server/web/api/admin/middleware.test.js` and scheduler tests.

Exit: nothing outside the plugin reads `api_keys`, except Bookshelf reads for
integration API responses.

### Phase 8: Better Auth client, team SSO, session management (L)

1. Better Auth client in `apps/admin-x-framework` with the plugin clients;
   `apps/admin/src/auth/client/better-auth-client.ts` implements `AuthClient`
   and is chosen when `config.auth.engine` allows, keeping
   `ghost-auth-client.ts` for older servers.
2. Team SSO with `@better-auth/sso` (OIDC and SAML), provisioning only existing
   staff or invited emails, with an Administrator settings UI. Account linking
   must not rely on the virtual `emailVerified` (§4.3); store real per-user
   verification first (§10).
3. Session management UI from `listSessions` and a Ghost endpoint that
   revokes one session by id, checking it belongs to the user (§10).

### Phase 9: Default flip and hardening (M, across releases)

1. Default `auth:engine` to `better-auth` in a minor; release notes say staff
   are signed out once.
2. Remove the rate-limiting middleware with the compatibility routes; Better
   Auth's limiter already runs on the `spam` limiters (Phase 1, item 6).
3. Count `Authorization: Ghost` usage per key and show it in the integrations
   UI.

### Phase 10: Ghost 7.0 (L)

1. §4.7 7.0 removals; scrypt for new hashes. Remove the legacy engine,
   `express-session`, `session-store.js`, `models/session.js`, `totp.ts`, the
   24-hour reset-token window and the `legacy` value. This ends the rollback
   window (§8), so it waits for 7.0 rather than a 6.x minor.
2. Remove `permissions` and `roles.permissions` from users API `include`.
3. Internal integrations move to site tokens or client-credentials OAuth.
4. Update API docs, SDKs and Docker migration notes.

### Phase 11: 7.x deprecation and Ghost 8.0 (L)

1. From 7.0: `Deprecation`/`Link` headers on `Ghost`-scheme responses,
   per-key usage, one-click site token replacement; the Staff Access Token UI
   becomes Personal Access Tokens.
2. Migration guide; Bearer in the Admin API SDK, Zapier and first-party
   integrations; announce the 8.0 removal at 7.0.
3. Decide whether Content API `?key=` survives as a public site token.
4. Ghost 8.0: §4.7 8.0 removals.

## 7. Testing

- **Adapter:** Better Auth's adapter suite on MySQL in CI, plus Ghost cases.
- **Plugins:** unit tests with an in-memory instance covering every
  verification branch, the unverified-session gate, error mapping,
  JWT checks, scopes, role ceiling, blocklist and allowlist.
- **Contract:** the `ghost/test/e2e-api` admin and content suites under
  `legacy` and `better-auth` (`auth__engine`) until the legacy engine
  goes; session snapshots must not change.
- **Native endpoints:** e2e for `/ghost/api/admin/auth/*`, including disabled
  paths returning 404 and unverified-session refusal.
- **Migrations:** forwards, rollback and idempotency as tables graduate;
  backfill with existing credential rows.
- **Browser:** existing `e2e/tests/admin` sign-in, 2FA, reset, role smoke and
  danger-zone tests under every engine; new tests for magic link (MailPit),
  passkey (virtual authenticator), TOTP and Personal Access Tokens.
- **Upgrade:** `legacy` signed in → `better-auth` (signed out once, existing
  password works, one code, not asked again) → back to `legacy` (the old
  session still works).
- **Apps:** app principals acting for a user and on their own; an app token
  cannot reach anything outside its scopes through an include or relation
  filter; no response carries `set-auth-token`, and a session token sent as
  `Bearer` is rejected.
- **Security:** direct requests to the native credential routes are rate
  limited like their compatibility routes; legacy boot succeeds without the
  Better Auth tables; old cookie rejected after password change; wrong origin
  rejected, including with distinct site and admin URLs; each revocation event
  (password change and reset, authentication reset, suspension, deletion) run
  under `better-auth`, then rolled back to `legacy`, leaves the pre-cutover
  cookie rejected; a second session revoked by a password change; email codes
  exhausted after the attempt limit, including concurrent attempts; content key refused on Admin API and vice versa; Bearer cannot
  exceed role or scopes; unverified session cannot call
  `/auth/change-password`; inactive users cannot sign in by any method.

## 8. Rollout and rollback

- `auth:engine` is config, not labs, because it rewires Express at boot. Labs
  flags gate the user-facing sign-in options and token UI per site.
- Ghost(Pro): internal sites on `better-auth` (Phase 3), then a cohort (Phase
  5), then all, gated by the upgrade test. Self-hosted defaults flip in a minor
  after Ghost(Pro) has run it (Phase 9).
- Admin feature-detects `config.auth` so a newer Admin works against an older
  server.
- Rollback: until 7.0 removes the legacy engine (Phase 10), set `auth:engine`
  back to `legacy`. Better Auth only deletes legacy
  `sessions` rows when a security event revokes them (Phase 2, step 7), so other
  old sessions still work and staff signed in since the flip
  sign in again; passwords keep working because both engines use
  `user_accounts` (§4.5). Magic links and Bearer
  tokens stop until the engine is switched back.
- Monitor sign-in outcomes by method, verification sends and failures, Bearer
  verifications and scope denials, `Ghost` scheme usage per key and
  `onAPIError`.

## 9. Risks

| Risk                                                           | Mitigation                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Table count on Ghost(Pro)                                      | In-development until shipped; migration review; Redis secondary storage for high-churn tables later |
| SQLite cannot run Better Auth                                  | Boot refuses the new engine on SQLite; legacy until 7.0                                             |
| Unverified sessions accepted by Better Auth endpoints          | Global before-hook in `ghostDeviceVerification`; e2e test                                           |
| Bearer tokens widen attack surface                             | Hashed, scoped, expiring, revocable, role-capped, rate-limited, shown once; reset revokes all       |
| Better Auth's rate limiter lacks success reset                 | `customStorage` over the `spam` limiters; an after-hook clears `userLogin` on success               |
| Plugin schema changes on upgrade                               | Tables in development until shipped; pinned catalog version; adapter and plugin suites in CI        |
| Cookie name or `Authorization failed` drift breaks older Admin | Both in §5, asserted by snapshots                                                                   |
| `config.security` is exposed to staff                          | New config under `auth:`; only allowlisted keys published                                           |
| Removing the `Ghost` scheme breaks integrations                | Only in 8.0, after a full 7.x deprecation cycle with usage data and SDK updates                     |

## 10. Decisions

Decided:

- Sessions and email-code verification move first; Bearer tokens and new
  sign-in methods build on Better Auth sessions directly, with no bridge.
- New Better Auth tables, started in development; existing tables are not
  altered (§4.1). `user_sessions` replaces `sessions`; no reuse of `tokens`.
- MySQL only, Knex adapter on Ghost's pool.
- Staff sign in again once at the cutover; no cookie exchange.
- Sessions cut over by 7.0; `Authorization: Ghost`, Staff Access Tokens and
  `api_keys` removed in 8.0.
- Config key `auth:engine`.
- No `bearer` plugin. It returns the session token in a `set-auth-token`
  header and accepts it as `Authorization: Bearer`, which would let any code
  that reads a sign-in response, including an embedded app, hold a staff
  credential. Scripts and CLIs use Personal Access Tokens or, later, the OAuth
  device-code flow (§11). Without it Better Auth still returns session
  tokens in JSON: a top-level `token` from `/sign-in/email` and
  `/change-password`, `session.token` from `/get-session`, and a `token` on
  each session from `/list-sessions`. A global after-hook removes them from
  every native response, with a test per shape; it landed with the handler
  mount in Phase 1. Revoking one session therefore goes through a Ghost endpoint that
  takes a session id, checks it belongs to the user and resolves the token
  server-side (Phase 8), not `revokeSession`.
- Installed apps are OAuth clients (Phase 4b) with an `app` principal, not
  holders of a staff session.

- `emailVerified` and `twoFactorEnabled` stay virtual (§4.3). Real per-user
  verification is a prerequisite for SSO account linking (Phase 8).
- Sessions last 180 days, absolute (`disableSessionRefresh`); rolling later.
- Email codes are random, hashed, and limited to five attempts each,
  replacing the TOTP derivation (§3.3).
- Magic link, passkey, TOTP and SSO skip the email code; `require_email_mfa`
  applies to password sign-in only.
- Scopes are the `object_type:action` permission keys, plus finer scopes
  where one key covers more than one capability, checked on includes and
  relations too (§3.3), with UI presets on top. Phase 4 starts with a spike.
- `user_accounts` is the only password store: the legacy engine moves to it in
  Phase 2 wherever it exists, and the migration that graduates it copies
  `users.password`. No dual write (§4.5).
- `/update-session` is disabled.

Open:

1. Content API keys: same 8.0 schedule, or kept as public site tokens. Decide
   in Phase 11, during 7.x; Phase 7 ports `verifyContentKey` unchanged either
   way.
2. Whether credential rows join content exports in 7.0. Decide in Phase 10.
3. Who owns a site token: `apiKey` references only a `user` or an
   `organization`. Decide in Week 4, before Berlin starts on 7 December.

## 11. Out of scope and later extensions

Out of scope: members authentication; unifying staff and member identities
(not precluded: `users` stays the Better Auth user model and tables are
`user_*`); replacing the permissions engine; identity, Tinybird and Featurebase
tokens; Ghost(Pro) support-access internals; webhook secrets, theme session
secret and private-site auth.

Later, each an additive plugin: OAuth device-code flow for CLIs; staff sign-in
audit trail from `databaseHooks.session.create.after`; multi-site staff
identity with `organization`; identity tokens on `jwt` and member sign-in on
`magicLink`/`emailOTP`; Content API keys as read-scoped tokens; audited
support impersonation via `impersonatedBy`.

## 12. File map

New (under `ghost/core/server` unless stated):

- `auth/better-auth/create-auth.ts`, `knex-adapter.ts`, `errors.ts`, `README.md`
- `auth/better-auth/plugins/staff-lifecycle.ts`, `device-verification.ts`,
  `api-keys.ts`, `sso.ts`
- `auth/principal.ts`, `auth/resolve-principal.ts`
- `auth/policy/scopes.ts`, `token-policy.ts`
- `data/migrations/versions/<next>/…` as tables graduate
- `apps/admin-x-framework/src/auth/`, `src/api/personal-access-tokens.ts`
- `apps/admin/src/auth/client/better-auth-client.ts`
- `apps/admin/src/settings/general/users/` token, passkey and authenticator UI
- `ghost/test/integration/auth/knex-adapter.test.ts`,
  `ghost/test/e2e-api/admin/auth-native.test.js`, `bearer-tokens.test.js`

Changed:

- `pnpm-workspace.yaml`, `ghost/core/package.json`, `ghost/core/boot.js`
- `web/api/endpoints/admin/app.js`, `middleware.js`, `routes.js`;
  `web/api/endpoints/content/middleware.js`; `web/parent/backend.js`
- `api/endpoints/session.js`, `authentication.js`, `users.js`,
  `utils/public-config/config.js`
- `auth/index.js`, `authenticate.js`, `api-key/admin.js`, `setup.js`,
  `passwordreset.js`, `reset-authentication.ts`
- `services/invites/accept.ts`, `services/integrations/integrations-service.js`,
  `services/internal-keys/index.ts`, `services/users`
- `models/user.js`, `models/api-key.js`
- `data/schema/schema.js`, `data/schema/in-development.ts`,
  `data/exporter/table-lists.js`, `ghost/test/unit/server/data/schema/integrity.test.ts`
- `ghost/core/shared/config/defaults.json`, `ghost/core/shared/labs.js`
- `apps/admin/src/auth/`, `apps/admin-x-framework/src/api/session.ts`
- `docs/codebase/authentication.md`, `docs/codebase/direction.md`

Removed in Phase 9 / 7.0: `auth/session/express-session.js`,
`session-store.js`, `session-from-token.ts`, `auth/totp.ts`,
`models/session.js`, the `sessions` table, `users.password`, the permission
tables.

Removed in 8.0: `auth/api-key/admin.js`, `content.js` (if replaced),
`plugins/api-keys.ts`, `models/api-key.js`, the `api_keys` table, Custom
Integrations UI.
