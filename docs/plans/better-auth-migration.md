# Better Auth migration plan

Status: proposal. Nothing in this plan has been implemented.

This plan describes how to move Ghost's staff authentication onto
[Better Auth](https://www.better-auth.com) while keeping every mechanism that
exists today working with its current wire contract:

- Admin sessions (email + password, `ghost-admin-api-session` cookie)
- Sign-in verification by six-digit email code (new-device check and the
  `require_email_mfa` setting)
- Admin API keys (integration JWTs signed with the key secret)
- Staff Access Tokens (Admin API keys bound to a staff user)
- Content API keys (`?key=` query parameter)
- Password reset, first-run setup, invitation acceptance, the authentication
  reset in the danger zone, and the SSO adapter hook

The second goal is structural: once the migration is complete, new credential
types and policies (authenticator-app 2FA, passkeys, magic links, OIDC or SAML
sign-in, scoped Bearer tokens, an OAuth provider for integrations, session
management UI) are Better Auth plugins that share one adapter, one hook
pipeline and one principal model, rather than new bespoke middleware.

It implements the approved engineering proposal "Proposal: Modern
Authentication" (Notion, September 2026), which set the direction: off-the-shelf
before bespoke, common API conventions (Bearer credentials, personal access
tokens, OAuth clients), least privilege by default, one authorisation model
(permissions describe the user, roles are presets, scopes restrict a token and a
user token's access is the intersection of the two), a standard credential
lifecycle, and incremental convergence with legacy cleanup in major versions.
It also builds on the earlier research document "Modernising Ghost's
Authentication" (Notion, April 2026), which validated the core architecture
with a proof of concept. Section 1.1 lists what that document changed in this
plan. The engineering roadmap places "port auth/session handling to React
(Better Auth)" in the next six months and the wider adoption and OAuth work
after that; Phases 1, 2 and 7 below are the roadmap items. Read the
[authentication guide](../codebase/authentication.md) for the current behaviour
and the [codebase direction](../codebase/direction.md) for why Better Auth is
the intended foundation.

## Contents

1. [Summary of the approach](#1-summary-of-the-approach)
2. [Current state that constrains the design](#2-current-state-that-constrains-the-design)
3. [Target architecture](#3-target-architecture)
4. [Data model and migrations](#4-data-model-and-migrations)
5. [Compatibility contract](#5-compatibility-contract)
6. [Phases](#6-phases)
7. [Testing strategy](#7-testing-strategy)
8. [Rollout, flags and rollback](#8-rollout-flags-and-rollback)
9. [Risks and mitigations](#9-risks-and-mitigations)
10. [Decisions to confirm before Phase 1](#10-decisions-to-confirm-before-phase-1)
11. [Out of scope](#11-out-of-scope)
12. [Extension catalogue](#12-extension-catalogue)
13. [File map](#13-file-map)

## 1. Summary of the approach

The migration follows **expand, migrate, contract**:

- **Expand.** Better Auth is added beside the existing stack. It authenticates
  staff with new methods (magic link, passkey, authenticator app) and issues
  standard scoped Bearer tokens, while a small bridge turns a Better Auth
  sign-in into an ordinary Ghost session. Nothing existing changes.
- **Migrate.** Ownership of sessions, sign-in verification, passwords and
  reset, then legacy API keys, moves into Better Auth behind a config switch.
  Existing routes, bodies, cookie name and error codes are kept by thin
  compatibility controllers. Staff are not logged out at cutover.
- **Contract.** In Ghost 7.0 the legacy session stack is removed. The
  `Authorization: Ghost` JWT scheme, Staff Access Tokens and Content API keys
  stay supported through 7.x, are deprecated during 7.x, and are removed in
  Ghost 8.0 once Bearer tokens and OAuth clients have replaced them. Product
  decides separately whether the database-driven permission tables go in 7.0.

Design choices that hold throughout:

- **Ghost keeps its database and conventions.** A Knex adapter written with
  Better Auth's `createAdapterFactory` runs against Ghost's existing Knex
  connection, 24-character ObjectId keys and `snake_case` columns. Better Auth
  model names are mapped onto Ghost tables. New tables are kept to a minimum
  because every table is multiplied by roughly 30,000 sites on Ghost(Pro).
- **Ghost-specific behaviour is written as Better Auth plugins**, not as forks
  of built-in ones: sign-in verification by email code, legacy API keys and
  staff tokens, staff lifecycle (setup, invitations, status policy), the SSO
  adapter bridge and a temporary legacy-session exchange. Standard capabilities
  come from Better Auth's own plugins (`magicLink`, `passkey`, `twoFactor`,
  `apiKey`, `bearer`, `sso`, `oauthProvider`).
- **Authorization stays in Ghost during the migration.** The permissions
  service (`canThis`, roles, permissions tables, model `permissible` hooks) is
  unchanged. One explicit `Principal` type is introduced that every credential
  resolves to, and `frame.options.context` is derived from it. Token policy
  (staff-token blocklist, integration allowlist, Bearer scopes) lives behind
  that seam, which is also where the 7.0 permission simplification would land.
- **Wire contracts are preserved** for Ember Admin, older React Admin builds,
  the comments moderation iframe, integrations and the Admin API SDK.

### 1.1 What the Notion proposal changed in this plan

| Topic | Notion proposal | This plan |
| --- | --- | --- |
| Sequencing | Value first: modern login methods and Bearer tokens ship while legacy auth stays authoritative; a bridge creates a Ghost session | Adopted. Phases 1 and 2 are the expand step; re-platforming sessions is Phase 3, not Phase 1 |
| Session bridge | Better Auth sign-in creates a standard Ghost session | Adopted as the Phase 1 mechanism, reusing the existing `sessionFromToken` pattern; retired in Phase 3 |
| Standard API tokens | `Authorization: Bearer` personal access tokens with scopes, token management UI, OAuth clients | Adopted as Phase 2 using Better Auth's `apiKey` and `bearer` plugins; OAuth clients via `@better-auth/oauth-provider` in Phase 7 |
| Legacy `Authorization: Ghost` scheme | Deprecated with warnings in 6.x, removed in 7.0; integrations move to Bearer tokens | Preserved through 7.x by the `ghostApiKeys` plugin, deprecated during 7.x, removed in Ghost 8.0 (§10). Sessions cut over by 7.0; API keys get one more major version so integrations have a full cycle to move |
| Permissions | 125 permissions across 5 tables replaced by role checks and scopes in 7.0 | Out of scope for the migration itself; the `Principal` and policy seam is designed so that replacement is mechanical in 7.0 |
| Table count | Concern about adding tables across Ghost(Pro); reuse `users` and `tokens`; net 3 fewer tables after 7.0 | Adopted as a constraint. Sessions evolve in place instead of a new table; new tables are budgeted in §4.1 and need infrastructure sign-off; reuse of the members `tokens` table is evaluated in §4.1 |
| Pro support access | Continues unchanged | The SSO adapter contract is unchanged; only its session creation call moves when sessions move (Phase 3), as it must |
| Proof of concept | A working PoC validated the architecture | Phase 0 starts by locating and reviewing it; its adapter, migrations and bridge should seed Phase 1 |

## 2. Current state that constrains the design

The facts below were verified against the codebase and drive the decisions in
this plan. File references are to `ghost/core/core/server` unless stated.

### Sessions

- `express-session` with a Bookshelf-backed store (`services/auth/session/express-session.js`,
  `session-store.js`, `models/session.js`). Cookie `ghost-admin-api-session`,
  `httpOnly`, path `<subdir>/ghost`, `maxAge` from `admin:sessionMaxAgeMs`
  (180 days), `sameSite: 'none'` and `secure` on HTTPS sites, `lax` otherwise.
  The signing secret is the `admin_session_secret` setting.
- Table `sessions` has `session_id` (the express sid), `user_id` and a
  `session_data` JSON blob capped at 2000 characters. There is no `expires_at`
  or token column; expiry lives in the cookie only. Logout clears
  `session_data.user_id` but leaves the row. Rows are never purged.
- The blob carries `user_id`, `origin`, `user_agent`, `ip`, `verified`,
  `verified_user_id`, `auth_code_challenge`, `auth_code_generated_at`.
- CSRF protection is origin pinning, not tokens: the request `Origin` (or
  `Referer`) must equal the admin origin, and must equal the origin stored on
  the session (`session-service.js` `cookieCsrfProtection`).
  `res.locals.bypassCsrfProtection` is an escape hatch.
- An **unverified session is treated as anonymous**: `session/middleware.js`
  `authenticate` leaves `req.user` unset, so `authorizeAdminApi` returns the
  403 `Authorization failed` that both admin clients interpret as "logged out".
- Password change destroys all of the user's session rows
  (`models/user.js` `changePassword`) and the request's own session is rotated
  and re-verified (`api/endpoints/users.js`, `api/endpoints/authentication.js`).
  The danger-zone reset truncates the table (`services/auth/reset-authentication.ts`).
- The SSO adapter hook (`services/auth/session/session-from-token.ts`, wired in
  `session/index.js` and mounted on `/ghost` in `web/parent/backend.js`) is a
  generic "credential → user → verified Ghost session" bridge. Ghost(Pro)
  support access is an implementation of the `@tryghost/adapter-base-sso`
  contract.

### Sign-in verification (email code)

- Not per-user 2FA enrolment. Every staff user is subject to it. The code is a
  TOTP derived from `admin_session_secret + user_id + per-session challenge`
  (`services/auth/totp.ts`: 6 digits, 60-second step, ±10 steps), the
  challenge expires after 5 minutes and is single use.
- Verification state lives on the session, and survives logout unless the
  `require_email_mfa` setting is on. In effect the browser is the "trusted
  device".
- First-ever login (`users.last_seen` is null) skips verification.
  `security:staffDeviceVerification` config (false in dev and test) disables it
  entirely.
- The response contract is a 403 with `errors[0].code` of
  `2FA_TOKEN_REQUIRED` or `2FA_NEW_DEVICE_DETECTED` and `type`
  `Needs2FAError`. `POST /session/verify` sends a code (200 `OK`), `PUT /session/verify`
  with `{token}` verifies it (200 `OK`, or a bare 401 on a wrong code). The
  login body may also carry an inline `token`.
- Email content includes device details from `ua-parser-js` and a geolocation
  lookup against `get.geojs.io` with a 500 ms timeout.

### Passwords, reset, setup, invitations

- Passwords are bcrypt hashes in `users.password` (`varchar(60)`), produced by
  `@tryghost/security` (bcryptjs) in `models/user.js` `onSaving`. Login is
  `models.User.check()`: `locked` users throw `PasswordResetRequiredError`
  (which also triggers a reset email), `inactive` users are refused, success
  updates `last_seen` and forces status back to `active`.
- Reset tokens are stateless HMACs over `expires|email|db_hash|password-hash`
  with a 24-hour lifetime (`services/auth/passwordreset.js`). Changing the
  password implicitly invalidates them. Locked users may reset; inactive users
  may not.
- Setup edits the fixture owner user (`services/auth/setup.js`); invitation
  acceptance validates a token in `invites` and creates the user with a role
  (`services/invitations/accept.js`). Both are unauthenticated routes.

### API keys and staff tokens

- Table `api_keys`: `type` (`admin`|`content`), `secret` (plaintext, unique),
  `role_id`, `integration_id`, `user_id`, `last_seen_at`, `last_seen_version`.
  A row with `user_id` set and `integration_id` null is a Staff Access Token.
  Internal integrations (`ghost-scheduler`, `ghost-internal-frontend`) are
  consumed in-process through `services/internal-keys`.
- Admin API auth (`services/auth/api-key/admin.js`): `Authorization: Ghost <JWT>`,
  HS256, header `kid` is the key id, secret is hex-decoded before verification,
  `aud` must match the API path, `maxAge` 5 minutes (ignored for scheduler
  URLs that carry `?token=` with their own `exp`/`nbf`). The client never sends
  the secret, so **the secret must remain recoverable server-side**. Better
  Auth's `apiKey` plugin hashes keys and binds them to a user, so it cannot
  host these legacy keys, but it is the right fit for new Bearer tokens.
- Content API auth (`api-key/content.js`): `WHERE secret = ?`, type must be
  `content`. The key is public by design.
- Staff tokens authenticate as an API key but authorize as the user
  (`services/permissions/can-this.js`). `web/api/endpoints/admin/middleware.js`
  `tokenPermissionCheck` adds a staff-token blocklist (`DELETE /db`,
  `PUT /users/owner`, `POST /authentication/reset`) and an integration
  allowlist by resource and method. There are no scopes.
- Any `Authorization` header whose scheme is not `Ghost` is rejected with
  `INVALID_AUTH_HEADER`, so Bearer tokens need an explicit pass-through.

### Clients

- Ember Admin (`apps/ember-admin`) is the only login UI. It relies on
  plain-text bodies (`Created`, `OK`), the 2FA error codes, the literal
  `Authorization failed` message to detect session expiry, and
  `GET /users/me/` as its "am I logged in" probe.
- React Admin (`apps/admin`, `apps/admin-x-framework`) rides the cookie, has
  `useAddSession`/`useVerifySession`/`useDeleteSession` defined but only uses
  sign-out, and hard-redirects to the admin root on 401. It reads
  `config.security.staffDeviceVerification` from `GET /config/`.
- `comments-ui` moderation uses a hidden `/ghost/auth-frame` iframe that the
  server only serves when the request cookie header contains the literal
  string `ghost-admin-api-session` (`web/admin/app.js`).
- Admin and Core deploy independently on Ghost(Pro); Admin must keep working
  against older servers.

### Platform

- Node `^22.23.1 || ^24.20.0`. Ghost Core compiles TypeScript to CommonJS.
  Better Auth (1.7.x) publishes ES modules only, so it must be loaded with
  `require(esm)` (unflagged on these Node versions) or a dynamic `import()`
  during boot. Confirm in the Phase 0 spike.
- Express 4.22. Better Auth's `toNodeHandler` must be mounted before
  `body-parser` because it reads the request stream itself.
- MySQL 8 and SQLite through Knex (`sqlite3` driver). Better Auth's Kysely
  adapter would need a second connection pool and a different SQLite driver,
  which is why this plan writes a Knex adapter.
- Ghost(Pro) runs one schema per site (96 tables today). Every new table is
  multiplied by roughly 30,000 sites, so table additions need infrastructure
  sign-off and the plan tracks a table budget (§4.1).
- Rate limiting is `express-brute` on the `brute` table with success resets
  in the login and reset controllers.
- Schema changes require a migration created with `pnpm migrate:create`,
  `schema.js` updates, integrity-hash updates, and classification in
  `data/exporter/table-lists.js` (see `.agents/skills/create-database-migration/SKILL.md`).

## 3. Target architecture

```text
                          ┌──────────────────────────────────────────────┐
  Ember Admin  ─────────► │  Compatibility controllers (unchanged paths) │
  older React Admin       │  /session, /session/verify, /authentication/*│──┐
                          │  /users/:id/token, /integrations/.../refresh │  │ auth.api.* (server-side calls)
                          └──────────────────────────────────────────────┘  │
                          ┌──────────────────────────────────────────────┐  ▼
  React Admin ──────────► │  Better Auth handler  /ghost/api/admin/auth/*│ ┌────────────────────────────┐
  (better-auth/client)    └──────────────────────────────────────────────┘ │ betterAuth() instance      │
                                                                          │  core: email+password,     │
  Bearer tokens,          ┌──────────────────────────────────────────────┐ │  sessions, verification    │
  legacy Ghost JWTs,    ► │  resolvePrincipal middleware                 │ │  built-in plugins:         │
  staff tokens, content   │  → req.auth: Principal                       │─│   magicLink, passkey,      │
  keys, cookie sessions   │  → frame.options.context (unchanged shape)   │ │   twoFactor, apiKey,       │
                          └──────────────────────────────────────────────┘ │   bearer, (sso, oauth)     │
                                                                          │  Ghost plugins:            │
                          ┌──────────────────────────────────────────────┐ │   ghostStaffLifecycle      │
                          │  Authorization (unchanged): authorizeAdminApi│ │   ghostDeviceVerification  │
                          │  permissions.canThis, token policy (scopes,  │ │   ghostApiKeys (legacy)    │
                          │  blocklist, allowlist)                       │ │   ghostSso                 │
                          └──────────────────────────────────────────────┘ │   ghostSessionBridge (tmp) │
                                                                          │   ghostLegacySession (tmp) │
                                                                          │  adapter: Knex (Ghost DB)  │
                                                                          └────────────────────────────┘
```

### 3.1 The Better Auth instance

Constructed once at boot by `services/auth/better-auth/create-auth.ts` with
injected dependencies (Knex connection, settings cache, config, URL utils,
mailer, i18n, models where still needed) and exposed to the rest of Core
through `services/auth/index.js`. Configuration highlights:

| Concern | Setting |
| --- | --- |
| Base path | `basePath: '/ghost/api/admin/auth'`, `baseURL` from `urlUtils.getAdminUrl()` |
| Secret | the `admin_session_secret` setting (already used for cookie signing) |
| IDs | `advanced.database.generateId` returns Ghost ObjectIds (same generator as the Bookshelf base model) |
| Cookie | `advanced.cookies.session_token = { name, attributes: { path, sameSite, secure, httpOnly } }` matching `express-session.js`. Name is `ghost-auth-session` while the bridge is active (Phases 1–2) and `ghost-admin-api-session` once Better Auth owns sessions (Phase 3) |
| Session lifetime | `session.expiresIn` = `admin:sessionMaxAgeMs / 1000`; `disableSessionRefresh: true` for parity with today's absolute expiry (revisit later) |
| Session fields | `session.additionalFields`: `verified` (boolean, `input: false`), `origin` (string, `input: false`) |
| User fields | `user.modelName: 'users'`, `fields: { image: 'profile_image', createdAt: 'created_at', updatedAt: 'updated_at', emailVerified: 'email_verified' }`, `additionalFields`: `status`, `slug`, `last_seen` (all `input: false`) |
| Accounts | `account.modelName: 'user_accounts'` with snake_case field mapping |
| Verification | `verification.modelName: 'verifications'` (or `tokens`, see §4.1) |
| Email + password | `enabled: true`, `disableSignUp: true`, `password: { hash, verify }` using bcrypt through `@tryghost/security` (see §4.4), `sendResetPassword` uses the existing `reset-password` mail template, `resetPasswordTokenExpiresIn: 86400`, `revokeSessionsOnPasswordReset: true`, `onPasswordReset` re-activates locked users |
| Origins | `trustedOrigins` as a function returning the admin origin and the site origin from `urlUtils` |
| IP | `advanced.ipAddress.ipAddressHeaders` aligned with Ghost's `trust proxy` setup |
| Rate limit | `rateLimit.enabled: false` while compatibility routes keep `express-brute`; enabled with custom storage in Phase 8 |
| Disabled paths | `disabledPaths` for everything Ghost does not offer: `/sign-up/email`, `/update-user`, `/change-email`, `/delete-user`, social sign-in |
| Telemetry | `telemetry: { enabled: false }` |
| Logging | `logger.log` routed to `@tryghost/logging` |

Built-in plugins and when they are enabled:

| Plugin | Package | Purpose | Phase |
| --- | --- | --- | --- |
| `magicLink` | `better-auth/plugins` | Staff magic-link sign-in; token in the verification store; `disableSignUp: true`; `sendMagicLink` uses Ghost mail | 1 |
| `passkey` | `@better-auth/passkey` | WebAuthn sign-in; `rpID`/`origin` from the admin URL; adds a `passkey` table | 1 (if table approved) |
| `twoFactor` | `better-auth/plugins` | Authenticator-app TOTP and backup codes, per-user opt-in; adds `user.two_factor_enabled` and a `two_factor` table | 1 (if table approved) |
| `apiKey` | `better-auth/plugins` | Personal Access Tokens: hashed keys, `permissions` scopes, expiry, per-key rate limit; `apiKeyHeaders` replaced by a custom getter for `Authorization: Bearer`; adds an `api_tokens` table (`modelName`) | 2 |
| `bearer` | `better-auth/plugins` | Accept a Better Auth session token as `Authorization: Bearer` for first-party tooling | 2 |
| `sso` | `@better-auth/sso` | OIDC and SAML sign-in for teams; adds `sso_providers` | 7 |
| `oauthProvider` | `@better-auth/oauth-provider` | Third-party OAuth clients with scopes; adds four tables | 7 or later, budget permitting |

### 3.2 The Knex adapter

A new internal package `packages/better-auth-knex` (`@tryghost/better-auth-knex`)
following the [internal package golden path](../../packages/README.md):

- Built with `createAdapterFactory` from `better-auth/adapters`. Config:
  `supportsJSON: false` (JSON stringified into text columns),
  `supportsBooleans: false` (MySQL `tinyint`, SQLite integers),
  `supportsDates: true` on MySQL and a custom transform on SQLite (Ghost stores
  `dateTime` as text there), `usePlural: false` (model names are mapped
  explicitly), `transaction` implemented with `knex.transaction`.
- Implements `create`, `findOne`, `findMany`, `update`, `updateMany`,
  `delete`, `deleteMany`, `count`, plus the optional `consumeOne` and
  `incrementOne` when they simplify verification and rate-limit paths.
  Translates Better Auth `where` clauses (`eq`, `ne`, `lt`, `lte`, `gt`,
  `gte`, `in`, `not_in`, `contains`, `starts_with`, `ends_with`, `AND`/`OR`
  connectors) to Knex.
- Does not implement `createSchema`; Ghost migrations own DDL.
- Verified by Better Auth's adapter test suite
  (`@better-auth/test-utils/adapter`) against MySQL and SQLite in CI, plus
  Ghost-specific tests for ObjectId generation and date handling.
- If the Notion proof of concept already contains an adapter, start from it.

### 3.3 Ghost plugins

Each is a `BetterAuthPlugin` under `services/auth/better-auth/plugins/`, with a
client counterpart in `apps/admin-x-framework` where the browser needs it.
Server-only endpoints are declared with `metadata: { SERVER_ONLY: true }` so
they are callable via `auth.api.*` but never exposed over HTTP.

The approved proposal asks every PR "Could Better Auth provide this?". The
answer for each Ghost-owned plugin:

| Ghost plugin | Could Better Auth provide it? |
| --- | --- |
| `ghostSessionBridge` | No. It exists only to hand a Better Auth sign-in to the legacy session while both run; deleted in Phase 3 |
| `ghostStaffLifecycle` | Partly. Sign-in, sessions and reset are Better Auth core; Ghost's `status` policy, `last_seen`, setup and invitation semantics are product rules layered on hooks |
| `ghostDeviceVerification` | Not as-is. `twoFactor` and `emailOTP` are per-user opt-in factors; Ghost's rule is "every staff user, trusted browser, satisfied by any stronger factor". The plugin composes Better Auth's verification store, cookies and hooks; if Ghost later moves to per-user opt-in 2FA, it is replaced by `twoFactor` |
| `ghostApiKeys` (legacy scheme) | No. The `apiKey` plugin hashes keys and binds them to a user; the legacy scheme needs a recoverable signing secret and integration-bound keys. New tokens use the `apiKey` plugin; the legacy plugin exists only until the scheme is retired |
| `ghostSso` | Partly. Team SSO uses `@better-auth/sso`; this plugin only keeps the Ghost(Pro) support-access adapter contract working |
| `ghostLegacySession` | No. One-off cookie exchange at cutover; deleted in Phase 8 |

**`ghostSessionBridge`** (temporary, Phases 1–2, removed in Phase 3)

- Express middleware on `/ghost` and the Admin API, placed where
  `createSessionFromToken()` is mounted today. If the request carries a valid
  Better Auth session (cookie `ghost-auth-session`) and no Ghost session for
  that user, it calls `sessionService.createVerifiedSessionForUser` (the same
  call the SSO adapter uses), then revokes the Better Auth session so exactly
  one session is live. Magic link, passkey and TOTP sign-ins count as
  verified: email possession, a phishing-resistant authenticator, or a second
  factor each meet or exceed what the email code proves.
- Reuses `session-from-token.ts` with `getTokenFromRequest` reading the Better
  Auth cookie and `getLookupFromToken` calling `auth.api.getSession`.

**`ghostStaffLifecycle`**

- Before-hook on `/sign-in/email`: look up the user; `locked` → send the
  password reset email and throw an `APIError` whose body carries
  `errorType: 'PasswordResetRequiredError'`; `inactive` → throw with the
  existing suspended message; unknown email and wrong password map to the
  existing messages (see §5.3).
- Before-hooks on `/sign-in/magic-link`, `/sign-in/passkey` and SSO
  callbacks: refuse `inactive` users (locked users may sign in with a
  non-password method and are re-activated, matching today's reset behaviour).
- After-hook on every sign-in: set `users.last_seen`, force `status` to
  `active` (today's `models.User.check` behaviour).
- `databaseHooks.session.create.before`: refuse sessions for users whose
  status is not active (defence in depth for every sign-in path).
- Server-only endpoints: `setupOwner` (replaces the password-setting part of
  `setup.js` `setupUser`), `acceptInvitation` (replaces
  `services/invitations/accept.js` user creation: validates the `invites`
  token, creates user + credential account + role in one transaction),
  `createVerifiedSession({userId, origin, ip, userAgent})` (used after
  password reset and self password change to replace
  `rotateAndAssignVerifiedUserToSession`), `revokeUserSessions({userId})`,
  `revokeAllSessions()`, `lockAllUsers()`.

**`ghostDeviceVerification`** (Phase 4)

- Owns the "is this session verified" state and the email-code flow.
- After-hook on `/sign-in/email` (and on any endpoint that creates a session):
  decide `verified` for the new session:
  1. `security:staffDeviceVerification !== true` → verified.
  2. user has never logged in (`last_seen` null) → verified.
  3. sign-in method was magic link, passkey, TOTP or SSO → verified.
  4. request body carries a valid inline `token` → verified.
  5. `require_email_mfa` setting is false and the request carries a valid
     device-trust cookie for this user → verified.
  6. otherwise → unverified; generate and email a code; respond 403 with
     `code: '2FA_TOKEN_REQUIRED'` (setting on) or `'2FA_NEW_DEVICE_DETECTED'`.
- Global before-hook: any Better Auth endpoint that requires a session refuses
  an unverified session, except `/device-verification/*` and `/sign-out`.
  Without this, Better Auth endpoints such as `/change-password` would accept
  a session Ghost considers anonymous.
- Endpoints `POST /device-verification/send` and `POST /device-verification/verify`
  (`{ token }`). Codes are 6 random digits (not TOTP; the per-session
  challenge is replaced by a row in the verification store keyed
  `device-verification:<sessionId>`, hashed value, 5-minute expiry, attempt
  counter). Successful verification sets `sessions.verified = true`, sets
  a signed device-trust cookie (`ghost-admin-device`, `httpOnly`, same
  attributes and lifetime as the session cookie, value bound to the user id)
  unless `require_email_mfa` is on, and deletes the verification row.
- After-hook on `/sign-out`: clear the device-trust cookie when
  `require_email_mfa` is on (today's `removeUserForSession` behaviour).
- Email rendering reuses `services/auth/session/emails/signin.js` and the
  device-details helper (user agent parsing and geolocation) moved into the
  plugin with an injectable lookup so tests do not hit the network.
- The "verified" predicate is one function that the `twoFactor` and `passkey`
  plugins already satisfy and that future factors extend.

**`ghostApiKeys`** (Phase 6; legacy `Authorization: Ghost` scheme and Content API keys)

- Declares the schema over the existing `api_keys` table (`modelName: 'api_keys'`,
  snake_case mapping). No new columns.
- Server-only endpoints, each a straight port of today's logic with the same
  error codes: `verifyAdminToken({ token, url, ignoreMaxAge })` → `{ apiKey, user | null }`
  (kid lookup, `type === 'admin'`, hex-decoded secret, HS256, `aud` path
  regex, 5-minute `maxAge`, `customIntegrations` limit check, active user for
  staff tokens); `verifyContentKey({ key })`; `getOrCreateStaffToken({ userId })`;
  `rotateSecret({ id })`; `rotateAllSecrets()`; `getInternalKey({ slug })`.
  Use `jose` (already in the catalog and a Better Auth dependency) for JWT
  verification.
- Enforces the role rules that `models/api-key.js` `onSaving` enforces today
  and records the `refreshed` action on rotation.
- Contributes to the `authorizationPolicy` used by `resolvePrincipal`:
  staff-token blocklist and integration allowlist, declared as data. The plugin is the whole legacy surface: it lives through 7.x, adds
  `Deprecation`/`Link` response headers and a per-key usage counter during the
  7.x deprecation runway (Phase 10), and is deleted in Ghost 8.0. If the
  permission tables are dropped in 7.0 (§10), the plugin maps each legacy key
  role (`Admin Integration`, `DB Backup Integration`, `Scheduler Integration`,
  `Self-Serve Migration Integration`, and the staff roles behind Staff Access
  Tokens) to a static scope set so legacy keys keep exactly their current
  authority without the tables.

**Bearer token policy** (Phase 2, lives in `services/auth/policy/`)

- Scopes for Personal Access Tokens are stored in the `apiKey` plugin's
  `permissions` field as `{ resource: [actions] }`, e.g.
  `{ posts: ['read', 'write'], members: ['read'] }`. `resolvePrincipal` maps a
  verified token to a user principal with `method: 'bearer_token'` and attaches
  the scopes; `tokenPermissionCheck` enforces them by resource and HTTP method
  the same way the integration allowlist works today, before the user's role
  permissions apply. Scopes can only narrow what the user's role allows.
- The scope vocabulary is a single table in `services/auth/policy/scopes.ts`
  shared by the token UI, the OAuth provider (`scopes` option) and, in 7.0,
  the simplified permission checks.
- **Site tokens.** The approved proposal distinguishes user tokens (access is
  the intersection of the user's permissions and the token's scopes) from site
  tokens that carry explicitly granted scopes of their own, which is what
  integrations need. Site tokens are a second `apiKey` configuration whose
  `referenceId` is the site (or integration) rather than a user, resolving to
  `kind: 'integration'`, `method: 'bearer_token'` with the token's scopes as
  the whole authority. They are the standards-based successor to Admin API integration keys; the legacy
  scheme is retired in Ghost 8.0 once site tokens have been available for the
  whole of 7.x.

**`ghostSso`** (Phase 6)

- Replaces the `createSessionFromToken()` wiring in `session/index.js`.
  Keeps the `@tryghost/adapter-base-sso` contract (`getRequestCredentials`,
  `getIdentityFromCredentials`, `getUserForIdentity`, injected user
  repository) so Ghost(Pro) support access keeps working unchanged, but
  creates the session through `internalAdapter.createSession` and marks it
  verified. Mounted on `/ghost` as today (`web/parent/backend.js`).

**`ghostLegacySession`** (temporary, Phase 3, removed in Phase 8)

- If the `ghost-admin-api-session` cookie value has the `express-session`
  shape (`s:<sid>.<signature>`), verify the signature with
  `admin_session_secret`, load the `sessions` row, and if it holds an active
  `user_id`, create a Better Auth session for that user with `verified`
  copied from the legacy blob (only when `verified_user_id === user_id`), set
  the new cookie and the device-trust cookie when verified, and delete the
  legacy blob columns. Invalid or unknown legacy cookies are treated as
  anonymous.
- Runs inside `resolvePrincipal` before `auth.api.getSession`, so staff are
  not logged out by the cutover.

### 3.4 Principal and request resolution

New `services/auth/principal.ts`:

```ts
type Principal =
  | { kind: 'user'; method: 'session' | 'staff_token' | 'bearer_token' | 'sso'; user: User; session?: Session; apiKey?: ApiKey; scopes?: Scopes }
  | { kind: 'integration'; method: 'admin_api_key' | 'content_api_key' | 'oauth_client'; apiKey: ApiKey; integration: Integration | null; scopes?: Scopes }
  | { kind: 'internal' }
  | { kind: 'anonymous' };
```

`services/auth/resolve-principal.ts` replaces `authenticate.js`:

1. `Authorization: Bearer <token>` → `auth.api.verifyApiKey` (Personal Access
   Token) or, failing that, Better Auth session token via the `bearer`
   plugin → user principal with scopes. Phase 2 introduces this branch as
   the "single line" that lets Bearer tokens through the scheme check.
2. `Authorization: Ghost <JWT>` → `auth.api.verifyAdminToken` (Phase 6; until
   then the existing `api-key/admin.js`) → user or integration principal
   (staff tokens produce `kind: 'user'`, `method: 'staff_token'`, keeping
   `apiKey` for audit attribution).
3. Otherwise a cookie → legacy exchange if needed → `auth.api.getSession({ headers })`
   → origin pinning check (`session.origin` vs request origin, honouring
   `res.locals.bypassCsrfProtection`) → user principal only when
   `session.verified` is true, else anonymous. Before Phase 3 this branch is
   the existing express-session middleware.
4. Content API: `?key=` → `auth.api.verifyContentKey`; then the existing
   members token middleware (unchanged).

`req.user`, `req.api_key` and `frame.options.context` (`{ internal, user,
api_key, integration, member, public }`) are derived from `req.auth` so
`authorizeAdminApi`, `updateUserLastSeen`, `parseContext`, `canThis`, model
`permissible` hooks and audit attribution keep working without changes.
Because API-framework code and many tests read `req.user`/`req.api_key` as
Bookshelf models, the resolver loads those models by id during the transition;
the `Principal` carries plain records for new TypeScript code.

In Ghost 7.0 the same seam is where role-name checks plus scopes can replace
the database permission tables, as the Notion proposal intends: `canThis`
consumers become `principal.can(resource, action)` backed by a static
role → scope matrix, and the `permissions`, `permissions_roles` and
`permissions_users` tables are dropped. That work is not part of this plan.

### 3.5 Express mounting

In `web/api/endpoints/admin/app.js`, before `bodyParser.json`:

```js
apiApp.all('/auth/*', toNodeHandler(auth)); // Express 4 wildcard syntax
```

Compatibility routes stay in `routes.js` and keep their `express-brute`
middleware. `mw.authAdminApi` swaps `auth.authenticate.authenticateAdminApi`
for `resolvePrincipal` when `auth:engine` is `hybrid` or `better-auth`.

## 4. Data model and migrations

All changes are additive until Ghost 7.0. Every migration is created with
`pnpm migrate:create`, updates `schema.js`, the integrity hashes in
`test/unit/server/data/schema/integrity.test.js`, and `data/exporter/table-lists.js`.

### 4.1 Table budget

Each table below is multiplied by every site on Ghost(Pro). Infrastructure
sign-off is required before Phase 1 for the "required" rows and before the
phase that introduces each optional row.

| Table | Better Auth model | Required? | Phase | Notes |
| --- | --- | --- | --- | --- |
| `user_accounts` | `account` | Required | 1 | Credential row per user now, OIDC/SAML accounts later; cannot be virtualised over `users` without losing multi-provider support |
| `verifications` | `verification` | Required unless `tokens` is reused | 1 | Magic-link tokens, device codes, reset tokens |
| `passkey` | `passkey` | Optional | 1 | Needed only for passkeys |
| `two_factor` | `twoFactor` | Optional | 1 | Needed only for authenticator apps and backup codes |
| `api_tokens` | `apikey` | Optional | 2 | Personal Access Tokens with scopes |
| `sso_providers` | `ssoProvider` | Optional | 7 | OIDC/SAML per site |
| `oauth_clients`, `oauth_access_tokens`, `oauth_refresh_tokens`, `oauth_consents` | `oauthProvider` | Optional | 7+ | Four tables; consider Redis-backed secondary storage for tokens |
| `sessions` | `session` | Existing | 3 | Evolved in place (§4.2), no new table |
| `rate_limits` | rate limit | Avoided | 8 | Use `rateLimit.customStorage` over the existing `brute` table or Redis |

Removals in Ghost 7.0 (see §4.6): `sessions` legacy columns, `users.password`,
`brute` if Better Auth rate limiting replaces `express-brute` everywhere, and,
if product confirms, `permissions`, `permissions_roles`, `permissions_users`.
`api_keys` stays through 7.x and is dropped in Ghost 8.0 with the legacy scheme.
Net table count is lower than today after 7.0 and lower again after 8.0.

Reusing the members `tokens` table for `verification`, as the proof of concept
did, saves one table. This plan does not recommend it: `tokens` is owned by
the members magic-link flow, `token` is `varchar(32)` (Better Auth identifiers
such as `reset-password:<token>` are longer), there is no `expires_at`, and
the single-use-token model has its own `used_count` semantics. If the table
budget forces it, the adapter can map `verification` onto `tokens` after a
migration that widens `token`, adds `expires_at` and an `identifier` index;
record that as an exception in the adapter README.

On Ghost(Pro), Better Auth's `secondaryStorage` (Redis via the existing cache
adapter) can hold sessions and verification values instead of MySQL. It does
not remove the need for the tables in the schema, but it can keep row counts
near zero. Evaluate it in Phase 0 as a Pro-only configuration.

### 4.2 Table definitions

`user_accounts` (backup table):

| column | type | notes |
| --- | --- | --- |
| `id` | string(24) pk | ObjectId |
| `user_id` | string(24), not null, index | references `users.id`, cascade delete |
| `account_id` | string(191), not null | `= user_id` for `credential` |
| `provider_id` | string(50), not null | `credential`, later OIDC providers |
| `password` | string(191), nullable | bcrypt now, longer hashes later |
| `access_token`, `refresh_token`, `id_token` | text, nullable | OAuth providers |
| `access_token_expires_at`, `refresh_token_expires_at` | dateTime, nullable | |
| `scope` | string(2000), nullable | |
| `created_at`, `updated_at` | dateTime | |

Unique index on (`provider_id`, `account_id`).

`verifications` (backup table): `id`, `identifier` string(191) index, `value`
text, `expires_at` dateTime index, `created_at`, `updated_at`.

`sessions` evolved in place (Phase 3):

| change | notes |
| --- | --- |
| add `token` string(191), nullable, unique | Better Auth session token; null on legacy rows |
| add `expires_at` dateTime, nullable, index | |
| add `ip_address` string(45), `user_agent` string(2000), `origin` string(2000) | replaces blob fields |
| add `verified` boolean, not null, default false | device verification |
| make `session_id` and `session_data` nullable | legacy columns, dropped in 7.0 |

The adapter filters `whereNotNull('token')` for Better Auth reads so legacy
rows are invisible to it, while `revokeUserSessions` deletes both shapes.
Reusing `sessions` rather than adding `user_sessions` was chosen for the table
budget; the cost is two nullable-column migrations and the filter above.

`users`: add `email_verified` boolean, not null, default `true` (Better Auth
core field; existing staff proved their address through invitation or setup).
`two_factor_enabled` boolean is added only with the `twoFactor` plugin.
`users.password` stays until Ghost 7.0 and is kept identical to the credential
account hash (§4.4).

`api_keys`: unchanged. `api_tokens` (Phase 2): the `apiKey` plugin schema with
snake_case mapping; `reference_id` is the staff user id.

### 4.3 Backfill migration

A transactional migration inserts one `user_accounts` row per user
(`provider_id = 'credential'`, `account_id = user.id`, `password = users.password`).
It is idempotent (skips users that already have a credential row) and logs
counts. It runs after the table migrations in the same version folder. The
proof of concept's seeding migration is the starting point.

### 4.4 Passwords

- Keep **bcrypt** as the algorithm for the whole migration.
  `emailAndPassword.password.hash/verify` delegate to `@tryghost/security`
  so hashes remain interchangeable between `users.password` and
  `user_accounts.password`.
- Dual write while both engines exist: `databaseHooks.account.update.after`
  copies the hash to `users.password`; `models/user.js` `onSaving` copies the
  hash to the credential row (new helper called from the hook; no new business
  logic in the model). The importer's `importPersistUser` path writes both.
- After Ghost 7.0 drops `users.password`, switch new hashes to Better Auth's
  default (scrypt) with a bcrypt-aware `verify` that rehashes on successful
  login.

### 4.5 Cleanup job

Better Auth does not purge expired rows. Add a daily job (jobs service) that
deletes expired sessions and verification rows. Today's `sessions` rows are
never purged.

### 4.6 Ghost 7.0 and 8.0 removals

Ghost 7.0: drop `sessions.session_id`/`session_data`, drop `users.password`,
remove `express-session`, `express-brute` for auth routes, `otplib`, and
`jsonwebtoken` where `jose` replaced it; product decision (§10) on replacing the
permission tables with role checks and scopes; decide whether `user_accounts`
credential rows are part of content exports (today `users.password` is
exported). Ghost 8.0: remove the `Authorization: Ghost` scheme, Staff Access
Tokens, `ghostApiKeys`, `api_keys` and the Custom Integrations UI in favour of
Bearer tokens and OAuth clients, after the whole of 7.x as a deprecation cycle.

## 5. Compatibility contract

These are the behaviours the migration must not change. They are covered by
existing tests listed in §7, which must pass unchanged under every engine
setting.

### 5.1 HTTP surface

| Route | Request | Response today | Notes |
| --- | --- | --- | --- |
| `POST /session` | `{ username, password, token? }` | `201` text `Created`, `Set-Cookie: ghost-admin-api-session=...`; `403` JSON with `code` `2FA_TOKEN_REQUIRED` / `2FA_NEW_DEVICE_DETECTED`, `type` `Needs2FAError`; `401 Access Denied.` on missing fields; `404 There is no user with that email address.`; `422` `PASSWORD_INCORRECT` `Your password is incorrect.`; `PasswordResetRequiredError` for locked users (and a reset email is sent); `429 TooManyRequestsError` | From Phase 3 calls `auth.api.signInEmail` with `returnHeaders` and forwards `Set-Cookie` |
| `DELETE /session` | cookie | `204` | `auth.api.signOut` |
| `POST /session/verify` | cookie, no body | `200` text `OK` | `/device-verification/send` |
| `PUT /session/verify` | `{ token }` | `200` text `OK`, bare `401` on wrong code | `/device-verification/verify` |
| `POST /authentication/password_reset` | `{ password_reset: [{ email }] }` | `{ password_reset: [{ message: 'Check your email for further instructions.' }] }`; suspended users refused | `auth.api.requestPasswordReset`; the email link keeps the shape `<admin>/reset/<token>/` |
| `PUT /authentication/password_reset` | `{ password_reset: [{ newPassword, ne2Password, token }] }` | `{ password_reset: [{ message: 'Password updated' }] }` plus a verified session cookie; expired/used/corrupt token messages | `auth.api.resetPassword` then `createVerifiedSession`; legacy stateless tokens accepted for 24 hours after cutover |
| `POST /authentication/setup`, `PUT /authentication/setup`, `GET /authentication/setup` | unchanged | unchanged | `setupOwner` for the password step |
| `POST /authentication/invitation`, `GET /authentication/invitation` | unchanged | unchanged | `acceptInvitation` |
| `POST /authentication/reset` | cookie | `{ security_action: [...] }` | rotates keys, locks users, revokes all sessions and Bearer tokens |
| `PUT /users/password` | `{ password: [{ oldPassword, newPassword, ne2Password, user_id }] }` | unchanged, other sessions revoked, own session rotated and verified | server-side change-password semantics, then `createVerifiedSession` |
| `GET/PUT /users/:id/token` | cookie | `{ apiKey: {...} }` | `getOrCreateStaffToken`, `rotateSecret` |
| `POST /integrations/:id/api_key/:keyid/refresh`, `POST /integrations` | unchanged | unchanged | `rotateSecret`; integration creation still generates `content` + `admin` keys |
| `GET /users/me/` | cookie, staff token or Bearer token | `200` when authenticated, `403 Authorization failed` otherwise | Ember's session probe |
| Admin API with `Authorization: Ghost <JWT>` | HS256, `kid`, `aud` | same error codes: `INVALID_AUTH_HEADER`, `INVALID_JWT`, `MISSING_ADMIN_API_KID`, `UNKNOWN_ADMIN_API_KEY`, `INVALID_API_KEY_TYPE` | Supported through 7.x; deprecation headers during 7.x (Phase 10); removed in 8.0 |
| Admin API with `Authorization: Bearer <token>` | new in Phase 2 | `401` with a new `INVALID_BEARER_TOKEN` code; scope violations `403` | additive |
| Content API `?key=` | | `UNKNOWN_CONTENT_API_KEY`, `INVALID_API_KEY_TYPE`, `INVALID_REQUEST` | |
| `GET /ghost/auth-frame` | cookie | served only when the cookie header contains `ghost-admin-api-session` | cookie name preserved from Phase 3; during Phases 1–2 the bridge creates that cookie |

### 5.2 Cookie

Name `ghost-admin-api-session`, `httpOnly`, path `<subdir>/ghost`,
`sameSite`/`secure` derived from the site URL exactly as today, lifetime
180 days by default from `admin:sessionMaxAgeMs`. During Phases 1–2 Better
Auth uses a second cookie (`ghost-auth-session`) that the bridge consumes
immediately; from Phase 3 Better Auth issues `ghost-admin-api-session` itself.

### 5.3 Error mapping

Compatibility controllers translate Better Auth `APIError`s into
`@tryghost/errors` so Ember's message and type matching keeps working:

| Better Auth | Ghost error |
| --- | --- |
| `USER_NOT_FOUND` on sign-in | `NotFoundError`, message `There is no user with that email address.` |
| `INVALID_EMAIL_OR_PASSWORD` for a known user | `ValidationError`, code `PASSWORD_INCORRECT`, message `Your password is incorrect.` |
| plugin `PASSWORD_RESET_REQUIRED` | `PasswordResetRequiredError` |
| plugin `ACCOUNT_SUSPENDED` | `NoPermissionError`, message `This account has been suspended.` |
| plugin `DEVICE_VERIFICATION_REQUIRED` | `NoPermissionError`, `errorType: 'Needs2FAError'`, `code` `2FA_TOKEN_REQUIRED` or `2FA_NEW_DEVICE_DETECTED`, existing `context` text |
| `INVALID_TOKEN` / expired reset token | existing `expired` / `invalidToken` / `corruptedToken` messages |
| `TOO_MANY_REQUESTS` | `TooManyRequestsError` |

The native Better Auth endpoints return Better Auth's own error shape; React
Admin's new sign-in code consumes those directly.

### 5.4 Behaviour

- Unverified sessions are anonymous for the Admin API and for Better Auth's
  session-protected endpoints.
- First login skips verification; `require_email_mfa` forces it on every
  password login and clears device trust on logout; `security:staffDeviceVerification`
  false disables it. Magic link, passkey, TOTP and SSO sign-ins are verified.
- Origin pinning per session, admin-origin check per request,
  `res.locals.bypassCsrfProtection` honoured.
- Password change or reset revokes every other session of the user and leaves
  the current browser verified. Authentication reset revokes every session and
  every Bearer token.
- Locked users can reset; inactive users cannot sign in or reset.
- Staff tokens are rejected on the three blocklisted operations; integration
  tokens are restricted to the allowlist; Bearer tokens are restricted to
  their scopes and can never exceed the user's role.
- Scheduler URL tokens ignore `maxAge` but honour `exp`/`nbf`.
- `last_seen` updated on login; `updateUserLastSeen` unchanged.
- Audit attribution (`actions` rows) distinguishes staff tokens, Bearer
  tokens and integration tokens.
- Ghost(Pro) support access through the SSO adapter keeps working in every
  phase.

## 6. Phases

Each phase ends with `pnpm check` green on MySQL and SQLite, the e2e API suite
green under every engine setting it affects, and a short update to
[authentication.md](../codebase/authentication.md). Sizes are rough relative
estimates for one engineer. Phases 1 and 2 correspond to the Notion
proposal's Phases 1 and 2; Phases 3 to 6 are the migration it deferred to
"clean up"; Phase 7 is its Phase 3; Phases 8 to 10 are its Phase 4, split so that sessions cut over in 7.0 and
API-key authentication is retired in 8.0.

### Phase 0: Spikes, sign-off and PoC review (S)

Goal: remove the unknowns before writing production code.

1. Locate the proof of concept referenced by the Notion proposal. Review its
   adapter, migrations, bridge and mount point; decide what to keep.
2. Loading spike: `require('better-auth')`, `better-auth/node`,
   `better-auth/plugins`, `better-auth/adapters`, `@better-auth/passkey` from
   a CommonJS TypeScript file in `ghost/core` on Node 22 and 24. Fall back to
   `await import()` in the service `init()` if `require(esm)` hits a
   top-level-await module.
3. Adapter spike: minimal Knex adapter passing Better Auth's adapter test
   suite against SQLite and MySQL (`docker/` MySQL). Confirm date, boolean and
   JSON handling and the ObjectId generator hook.
4. Storage spike: `secondaryStorage` on Redis through the cache adapter for
   sessions and verifications on Ghost(Pro); confirm which flows still write
   rows.
5. API confirmation: `metadata.SERVER_ONLY` endpoints, `returnHeaders` on
   `auth.api.signInEmail`, `advanced.cookies.session_token` attributes with a
   path, `session.additionalFields` with `input: false`, `ctx.context.newSession`
   in after-hooks, `internalAdapter.createSession` + `setSessionCookie`,
   `apiKey` plugin `customAPIKeyGetter` for the `Bearer` scheme and
   `permissions` checks. Record exact names in the plugin READMEs.
6. Infrastructure sign-off on the Phase 1 table budget (§4.1): `user_accounts`
   and `verifications` required; `passkey` and `two_factor` optional.
7. Security review of §3.3 with whoever owns Ghost security (bridge,
   unverified-session gate, device-trust cookie, legacy exchange, origin
   pinning, secret reuse, Bearer token storage).
8. Confirm the decisions in §10. Update `direction.md` status for
   authentication from "Exploring" to "Active migration" when Phase 1 starts.

Exit: written notes in `services/auth/better-auth/README.md`; go/no-go.

### Phase 1: Foundations, session bridge, modern sign-in methods (M)

Goal: Better Auth runs beside the legacy stack; staff can sign in with a
magic link, passkey or authenticator app; password sign-in, sessions, API
keys and Pro support access are untouched. Notion Phase 1.

1. Add `better-auth` (and `@better-auth/passkey` if approved) to the catalog
   in `pnpm-workspace.yaml`; depend on them from `ghost/core` and the adapter
   package.
2. Create `packages/better-auth-knex` from `packages/_template` with the
   adapter, its test suite and a README.
3. Migrations (one version folder): `user_accounts`, `verifications`,
   `users.email_verified`, credential backfill; optionally `passkey`,
   `two_factor`, `users.two_factor_enabled`. Update `schema.js`, exporter
   table lists, integrity hashes. Run the migration integration test forwards,
   rollback and forwards on both databases.
4. `services/auth/better-auth/create-auth.ts` with the configuration in §3.1,
   the `magicLink` plugin (and `passkey`, `twoFactor` if approved),
   `ghostStaffLifecycle` status hooks, and `ghostSessionBridge`. `init()`
   called from `boot.js` after the database and settings cache are ready.
5. Mount the handler in `admin/app.js` before body parsing and the bridge on
   `/ghost` next to `createSessionFromToken()`. Better Auth's cookie is
   `ghost-auth-session` in this phase.
6. Dual-write of password hashes (§4.4) from this phase on.
7. Config `auth:engine` (`legacy` | `hybrid` | `better-auth`, default
   `legacy`) in `defaults.json` and the config docs; expose
   `config.auth = { engine, methods }` from `services/public-config/config.js`
   (do not place it under `security`). Labs flags `staffMagicLinks`,
   `staffPasskeys`, `staffAuthenticatorApp` gate the sign-in options in Admin.
8. Sign-in UI: add "Send me a magic link", "Sign in with passkey" and the
   authenticator-app verification step. Build them in React
   (`apps/admin/src/auth/`) if the React sign-in route can be owned early;
   otherwise add the options to Ember's signin controller and move them in
   Phase 7. Passkey enrolment and authenticator setup live in the React
   profile settings.
9. Tests: adapter suite; plugin unit tests; new e2e tests for magic link,
   passkey (WebAuthn virtual authenticator in Playwright) and TOTP creating a
   verified Ghost session through the bridge; the full existing admin e2e
   suite unchanged under `hybrid`.

Exit: `hybrid` on internal Ghost(Pro) sites; magic link, passkey and TOTP work
for staff; no change to any existing contract.

### Phase 2: Standard Bearer tokens with scopes (M, overlaps Phase 1)

Goal: CLI tools, AI agents and automations authenticate with
`Authorization: Bearer <token>`. Notion Phase 2.

1. Migration for `api_tokens` (the `apiKey` plugin schema, snake_case). Enable
   the `apiKey` plugin with `customAPIKeyGetter` reading the `Bearer` scheme,
   `disableSessionForAPIKeys: true`, `requireName: true`, a `ghost_pat_`
   prefix, key expiration limits, and `permissions` scopes from
   `services/auth/policy/scopes.ts`. Enable the `bearer` plugin for
   first-party tooling that holds a session token.
2. The pass-through: `api-key/admin.js` (later `resolvePrincipal`) hands
   `Bearer` headers to `auth.api.verifyApiKey` instead of returning
   `INVALID_AUTH_HEADER`. The result becomes a user principal with scopes;
   `tokenPermissionCheck` enforces scopes by resource and method.
3. Personal Access Tokens UI in React settings (`apps/admin/src/settings/general/users/`):
   create with name, scopes and expiry, list, revoke; the raw token is shown
   once. The Staff Access Token UI stays until 7.0, then points users to Personal Access
   Tokens; existing staff tokens keep verifying until 8.0.
   Site tokens with explicit scopes are created from the Integrations settings
   (Administrators only) and appear beside the integration's legacy keys.
4. Danger-zone reset revokes all `api_tokens`; user suspension and deletion
   revoke the user's tokens.
5. Tests: e2e for Bearer auth success, missing scope, expired token, revoked
   token, role ceiling (a Contributor's token cannot publish), audit
   attribution; `key-authentication.test.js` unchanged.
6. Public docs: add Bearer tokens to the Admin API documentation as the
   recommended method for new integrations; the `Ghost` scheme remains
   documented.

Exit: Bearer tokens available on `hybrid` sites; the Admin API SDK gains
Bearer support as a follow-up.

### Phase 3: Sessions on Better Auth (L)

Goal: with `auth:engine = better-auth`, Better Auth owns the staff session;
the bridge is gone; existing sessions survive the switch.

1. Migrations: evolve `sessions` (§4.2).
2. Switch the cookie name to `ghost-admin-api-session`; retire
   `ghost-auth-session` and `ghostSessionBridge`; implement
   `ghostLegacySession`.
3. Implement `Principal`, `resolvePrincipal`, and derive `req.user`,
   `req.api_key`, `frame.options.context` from it. Wire into
   `mw.authAdminApi`, `mw.authAdminApiWithUrl` and the Content API
   middleware. The `Ghost` JWT branch still calls the existing
   `api-key/admin.js` in this phase.
4. Compatibility controllers for `POST /session` and `DELETE /session` in
   `api/endpoints/session.js`, selected by engine. Keep `express-brute`
   middleware and the `req.brute.reset()` on success.
5. Session revocation seams: `models/user.js` `changePassword`,
   `services/users.js` suspension and destroy paths, and
   `reset-authentication.ts` call `revokeUserSessions`/`revokeAllSessions`
   through `services/auth`. Suspending or deleting a user now revokes sessions
   (today they linger).
6. `PUT /users/password` and `PUT /authentication/password_reset` use
   `createVerifiedSession` for the current browser under the new engine.
7. Cleanup job for expired sessions and verifications.
8. Run `test/e2e-api/admin/session.test.js`, `session-invalidation.test.js`,
   `users.test.js`, `api-tokens.test.js`, `key-authentication.test.js`,
   `sso.test.js` and `e2e/tests/admin/signin.test.ts` under the new engine
   with `security:staffDeviceVerification = false`.

Exit: parity for sign-in, sign-out, session expiry, revocation and origin
pinning; upgrade test (§7) passes.

### Phase 4: Sign-in verification by email code (M)

1. Implement `ghostDeviceVerification` per §3.3, including the unverified
   session gate on Better Auth endpoints and the device-trust cookie.
2. Compatibility controllers for `POST /session/verify` and
   `PUT /session/verify`, including the inline `token` on `POST /session`.
3. Move the sign-in email template and device-details helper into the plugin;
   keep the subject `<code> is your Ghost sign in verification code` (the
   browser tests read it).
4. Legacy exchange sets device trust for verified legacy sessions so the
   cutover does not re-prompt everyone.
5. Run the `Staff 2FA` block of `session.test.js`, `rate-limiting.test.js`,
   and `e2e/tests/admin/two-factor-auth.test.ts` with
   `security__staffDeviceVerification=true`.

Exit: identical client experience for new-device verification and
`require_email_mfa`.

### Phase 5: Password lifecycle, setup and invitations (M)

1. `POST /authentication/password_reset` → `requestPasswordReset` with
   Ghost's mail template and URL shape; `PUT` → `resetPassword`, accepting the
   legacy stateless token format for 24 hours after cutover, then verified
   session creation and `express-brute` reset as today.
2. `setupOwner` and `acceptInvitation` endpoints; `services/auth/setup.js`
   and `services/invitations/accept.js` call them under the new engine.
   Invitation tokens stay in `invites`.
3. `PasswordResetRequiredError` flow for locked users, including the automatic
   reset email.
4. Run `authentication.test.js`, `invites.test.js`,
   `test/legacy/api/admin/authentication.test.js`, and
   `e2e/tests/admin/reset-password.test.ts`, `staff-role-smoke.test.ts`,
   `settings/danger-zone.test.ts`.

Exit: `@tryghost/security` reset-token helpers are only used by the legacy
engine and the 24-hour compatibility window.

### Phase 6: Legacy API keys as a plugin, SSO, principal unification (M)

1. Implement `ghostApiKeys` and switch `resolvePrincipal` to
   `verifyAdminToken`/`verifyContentKey` under the new engine.
2. Move the staff-token blocklist and integration allowlist into
   `services/auth/policy/` beside the Bearer scopes; `tokenPermissionCheck`
   becomes a thin caller.
3. `users.js` staff-token endpoints, `integrations-service.js` key refresh and
   `models/api-key.js` `refreshAllSecrets` call plugin endpoints;
   `services/internal-keys` reads through `getInternalKey` and keeps its
   process cache and `.clear()` contract. Keep `last_seen_at`/`last_seen_version`.
4. `ghostSso` replaces the `session-from-token.ts` wiring; `DefaultSSOAdapter`
   and the adapter contract are unchanged. Verify `sso.test.js` and a Ghost(Pro)
   support-access smoke test.
5. Audit every reader of `req.user`, `req.api_key`, `frame.user` and
   `frame.original.session` (notably `api/endpoints/users.js`,
   `authentication.js`, `packages/api-framework/lib/http.js`) and make them
   read from the principal.
6. Run `api-tokens.test.js`, `key-authentication.test.js`,
   `integrations.test.js`, `test/e2e-api/content/key-authentication.test.js`,
   `test/unit/server/web/api/admin/middleware.test.js`, and the scheduler
   publish tests.

Exit: no request path reads `api_keys` outside the plugin, except Bookshelf
reads for the integrations Admin API responses. Documentation of extension
points is complete.

### Phase 7: React sign-in, SSO for teams, session management (L)

Notion Phase 3. Aligns with the Ember-to-React migration.

1. `better-auth/client` in `apps/admin-x-framework` with
   `createAuthClient({ baseURL: <apiRoot>/auth, plugins: [magicLinkClient(), passkeyClient(), twoFactorClient(), ghostDeviceVerificationClient()] })`.
   Feature-detect with `config.auth.engine`; fall back to the existing
   `useAddSession` family against older servers.
2. React sign-in, verification, password reset, invitation and setup screens
   in `apps/admin/src/auth/` (or finish the ones started in Phase 1), using
   Shade. Remove those routes from `EMBER_ROUTES` once shipped behind an
   Admin flag. Keep the `Authorization failed` and 401 handling in
   `fetch-api.ts` and `handle-response.ts`; add a proper "session expired"
   redirect to sign-in.
3. SSO: enable `@better-auth/sso` (`sso_providers` table, budget permitting)
   with OIDC and SAML, `disableSignUp`-style provisioning that only maps to
   existing staff users or invited emails, and a settings UI for
   administrators. Pro support access stays on the adapter.
4. Session management: list and revoke devices from `listSessions` and
   `revokeSession`, with the unverified-session gate in place.
5. Optional: `@better-auth/oauth-provider` for third-party OAuth clients using
   the same scope vocabulary, if the four-table budget is approved (or Redis
   secondary storage holds the token tables).

### Phase 8: Default flip, deprecations, hardening (M, spread over releases)

1. Flip `auth:engine` default to `better-auth` in a minor release; note in
   release notes that no re-login is required.
2. Enable Better Auth rate limiting with `rateLimit.customStorage` backed by
   the existing `brute` table (or Redis on Ghost(Pro)) and `customRules`
   mirroring `spam.user_login`, `user_reset`, `user_verification`,
   `send_verification_code`, `global_reset`, with reset-on-success parity.
   Remove `express-brute` from the compatibility routes only then.
3. Start counting legacy `Authorization: Ghost` usage per key in `ghostApiKeys`
   and surface it in the integrations UI, so the 7.x deprecation runway (Phase
   10) begins with data.
4. After one release with no incidents: remove the legacy engine,
   `ghostLegacySession`, `express-session`, `session-store.js`,
   `models/session.js`, `totp.ts`, the legacy reset-token window, and the
   `hybrid`/`legacy` values of `auth:engine`.

### Phase 9: Ghost 7.0 contract for sessions (L)

Notion Phase 4, first half. Breaking changes for staff sessions only; API keys
are untouched.

1. Migrations in §4.6: drop legacy `sessions` columns and `users.password`;
   switch new password hashes to scrypt with bcrypt-aware verification.
2. If confirmed: replace `canThis` and the permission tables with role checks
   plus scopes at the principal seam (mechanical change across ~70 endpoint
   files), drop `permissions`, `permissions_roles`, `permissions_users`.
   `ghostApiKeys` maps legacy key roles to static scope sets so integration
   keys and Staff Access Tokens keep their current authority (§3.3).
3. Internal integrations (`ghost-scheduler`, `ghost-internal-frontend`) move
   to site tokens or client-credentials OAuth clients so nothing inside Ghost
   depends on the legacy scheme before it is deprecated.
4. Update the public API documentation, SDKs and the Docker images' migration
   notes.

### Phase 10: 7.x deprecation runway and Ghost 8.0 contract (L)

Notion Phase 4, second half. Sessions are already on Better Auth; this phase
retires API-key-based authentication.

1. From 7.0: `ghostApiKeys` adds `Deprecation` and `Link` headers to
   responses authenticated with the `Ghost` scheme and logs per-key usage;
   the integrations UI shows which keys are still in use and offers a
   one-click site token with equivalent scopes. The Staff Access Token UI is
   replaced by Personal Access Tokens; existing staff tokens keep working.
2. Publish the migration guide and ship Bearer support in the Admin API SDK,
   Zapier and other first-party integrations; announce the 8.0 removal at
   7.0.
3. Content API keys: decide during 7.x whether the `?key=` contract survives
   8.0 as a public site token (same query parameter, token store behind it)
   or is removed with themes and Portal updated. Because the key is an
   identifier rather than a secret, a like-for-like replacement is
   straightforward.
4. Ghost 8.0: remove the `Authorization: Ghost` scheme, Staff Access Tokens,
   `ghostApiKeys`, `api-key/admin.js`, `api-key/content.js` (if Content API
   keys are replaced), the Bookshelf `ApiKey` model, the Custom Integrations
   UI, and drop the `api_keys` table.

## 7. Testing strategy

- **Adapter**: Better Auth's adapter suite in `packages/better-auth-knex`
  (vitest) against SQLite locally and MySQL in CI, plus Ghost-specific cases
  (ObjectId ids, `dateTime` round-trips, JSON in text columns, transactions,
  the `sessions` legacy-row filter).
- **Plugins**: unit tests per plugin with an in-memory Better Auth instance
  and the memory adapter, covering every branch of the verification decision,
  the unverified-session gate, the bridge, error mapping, JWT verification
  (kid, aud, maxAge, hex secret, `nbf`), Bearer scope enforcement and role
  ceiling, staff-token blocklist and integration allowlist.
- **Contract tests**: the existing `test/e2e-api/admin` and
  `test/e2e-api/content` suites are the compatibility oracle. Run them in CI
  under `legacy`, `hybrid` and `better-auth` (`auth__engine` environment
  variable) until the legacy engine is removed. The session snapshots
  (`set-cookie` prefix, 2FA error body) must not change.
- **Native endpoint tests**: new e2e tests for `/ghost/api/admin/auth/*`
  covering magic link, passkey, TOTP, Bearer tokens, sign-in, sign-out,
  verification, reset, disabled paths returning 404, and unverified-session
  refusal on protected endpoints.
- **Migration tests**: `test/integration/migrations/migration.test.js` forwards,
  rollback and idempotency on both databases; a backfill test with users that
  already have credential rows.
- **Browser tests**: `e2e/tests/admin/signin.test.ts`, `two-factor-auth.test.ts`,
  `reset-password.test.ts`, `staff-role-smoke.test.ts`, `settings/danger-zone.test.ts`
  under every engine; new tests for magic link (MailPit), passkey (Playwright
  virtual authenticator), TOTP, Personal Access Tokens UI and the React
  sign-in screens.
- **Upgrade test**: start Ghost on `legacy`, sign in (verified), switch to
  `hybrid` and confirm nothing changes, switch to `better-auth` and confirm
  the next request exchanges the cookie and the user is neither logged out nor
  re-prompted; switch back and confirm sign-in still works.
- **Security checks**: cloned pre-change cookie rejected after password
  change; verified state cannot transfer between users; wrong-origin requests
  rejected; content key cannot hit Admin API; admin key cannot hit Content
  API; staff token blocklist; Bearer token cannot exceed role or scopes;
  unverified session cannot call `/auth/change-password`; bridge cannot
  create a Ghost session for an inactive user.
- **Static**: `pnpm check` plus `pnpm lint:packages` for the new package.

## 8. Rollout, flags and rollback

- `auth:engine` config (`legacy` | `hybrid` | `better-auth`) selects
  middleware and controllers at boot. It is config rather than a labs flag
  because it rewires Express at boot and must be set per deployment by
  operators or Ghost(Pro) tooling. Labs flags gate the user-facing sign-in
  options and the Personal Access Tokens UI so they can be enabled per site.
- Ghost(Pro) rollout: internal sites on `hybrid` (Phases 1–2), then a cohort,
  then all; the same path again for `better-auth` (Phase 3+) with the upgrade
  test in §7 as the gate. Self-hosted: default flips in minor releases after
  Ghost(Pro) has run each step.
- React Admin feature-detects `config.auth.engine` and `config.auth.methods`
  so an Admin build ahead of the server keeps using compatibility routes.
- Rollback: set `auth:engine` back one step. From `hybrid` to `legacy`: the
  handler and bridge unmount; magic-link, passkey and Bearer sign-ins stop but
  no existing session is affected. From `better-auth` to `hybrid`: sessions
  created by Better Auth have no legacy blob, so affected staff sign in again;
  passwords keep working because hashes are dual-written; API keys are
  untouched.
- Monitoring: log and count sign-in outcomes by method, verification sends
  and failures, legacy exchanges, Bearer token verifications and scope
  denials, legacy `Ghost` scheme usage per key, and Better Auth `onAPIError`
  events; alert on sign-in failure rate changes during rollout.

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Better Auth is ESM-only and Ghost Core is CommonJS | Phase 0 loading spike; dynamic `import()` in `init()` as fallback; new code is TypeScript that can move to ESM later |
| Table additions on Ghost(Pro) | Budget in §4.1, infra sign-off per phase, `sessions` evolved in place, Redis secondary storage evaluated, optional tables gated by feature |
| Bridge era runs two session systems | Bridge revokes the Better Auth session after creating the Ghost one; single cookie of record; bridge is deleted in Phase 3 |
| Two access paths to `api_keys` (Bookshelf and adapter) during transition | Plugin owns all writes; Bookshelf reads only for API responses |
| Legacy session exchange bugs log staff out or upgrade an unverified legacy session | Copy `verified` only when `verified_user_id === user_id`; exchange only active users; unit tests on signature verification; forced re-login is the fallback (§10) |
| Unverified Better Auth session accepted by Better Auth's own endpoints | Global before-hook gate in `ghostDeviceVerification`; e2e test |
| Bearer tokens widen the attack surface | Hashed at rest, scoped, expiring, revocable, role-ceilinged, rate-limited per key, shown once; reset-authentication revokes all |
| Better Auth's rate limiter has fixed windows and no success reset | Keep `express-brute` on compatibility routes until Phase 8; `customStorage` over `brute` with reset-on-success |
| Stateful reset tokens change invalidation semantics | `revokeSessionsOnPasswordReset`, single-use rows, 24-hour expiry, `onPasswordReset` deletes other outstanding reset rows |
| Cookie name or `Authorization failed` message drift breaks clients | Both are in the compatibility contract (§5) and asserted by snapshots |
| `config.security` is exposed verbatim to staff | New config lives under `auth:`; only `engine` and `methods` are published |
| Geolocation lookup in the sign-in path | Injectable provider with the existing 500 ms timeout |
| Better Auth upgrades change plugin APIs | Pin the catalog version; adapter and plugin suites run in CI; upgrade deliberately |
| Importer/exporter of password hashes | `users.password` stays the exported field until 7.0; importer writes both columns |
| Removing the `Ghost` scheme breaks integrations | Only in 8.0, after the whole of 7.x as a deprecation cycle with usage telemetry and SDK/Zapier updates; the 7.0 session cutover does not touch integrations |

## 10. Decisions to confirm before Phase 1

1. **Sequencing.** Recommended: expand first (Phases 1–2 with the bridge), as
   the Notion proposal argues, then migrate sessions. Alternative: migrate
   sessions first and add methods afterwards (less throwaway code, slower
   value).
2. **Table budget.** Which optional tables are approved for Phase 1
   (`passkey`, `two_factor`) and Phase 2 (`api_tokens`); whether Redis
   secondary storage is used on Ghost(Pro); whether `verifications` is a new
   table or the members `tokens` table is reused (not recommended, §4.1).
3. **Legacy session exchange vs forced re-login at the Phase 3 cutover.**
   Recommended: exchange.
4. **Session lifetime semantics.** Recommended: keep absolute 180 days
   (`disableSessionRefresh: true`); consider rolling refresh later.
5. **Verification code generation.** Recommended: random 6-digit codes stored
   hashed in the verification store with an attempt counter, replacing the
   TOTP derivation.
6. **Verified-by-method policy.** Recommended: magic link, passkey, TOTP and
   SSO sign-ins skip the email code; `require_email_mfa` applies to password
   sign-in only, and is satisfied by any second factor.
7. **Two-major-version schedule for API keys.** Decided direction: sessions cut
   over by Ghost 7.0; the `Authorization: Ghost` scheme, Staff Access Tokens and
   `api_keys` stay supported through 7.x, are deprecated from 7.0 and are
   removed in Ghost 8.0. The April research document proposed 7.0 for both; this
   plan gives integrations a full major version. Still open: whether Content API
   keys follow the same schedule or survive as public site tokens (Phase 10).
8. **7.0 end state for permissions.** The Notion proposal replaces the
   permission tables with role checks and scopes. Out of scope here; the
   principal seam is designed for it. Confirm intent so the scope vocabulary
   in Phase 2 is shaped accordingly.
9. **Config key name.** Recommended: `auth:engine`.
10. **Whether `user_accounts` credential rows join content exports in 7.0.**

## 11. Out of scope

- Members authentication (magic links, OTC, member sessions and identity
  tokens). It shares only `authenticate.js` composition with staff auth and
  is a separate migration candidate once the staff engine is stable.
- Unifying staff and member identities, which the approved proposal puts "on
  the table" without deciding. This plan neither requires nor precludes it:
  `users` stays the Better Auth user model and new tables are named
  `user_*` rather than `staff_*`, so members could later become Better Auth
  users with a different access profile without renaming anything. Session
  isolation, the unverified-session gate and the principal seam are the
  controls that would have to become load-bearing if that happens.
- Replacing the permissions engine during the migration. The principal seam
  is the only authorization change before 7.0.
- Identity tokens (`GET /identities`, RS256, JWKS) and the Tinybird and
  Featurebase token endpoints. Candidates for Better Auth's `jwt` plugin later.
- Ghost(Pro) support access internals; only the adapter's session creation
  call changes.
- Webhook secrets, theme session secret, private-site auth.

## 12. Extension catalogue

Beyond what the phases deliver, each of these is an additive plugin plus a
migration where new columns are needed:

- Third-party OAuth clients through `@better-auth/oauth-provider` if not
  delivered in Phase 7, including device-code flow for CLIs.
- Staff login event audit trail via `databaseHooks.session.create.after`.
- Organisation or multi-site staff identity via the `organization` plugin on
  Ghost(Pro).
- Migrating identity tokens to the `jwt` plugin and members sign-in to
  `magicLink`/`emailOTP`.
- Content API keys re-issued from the token store with read scopes.
- Admin impersonation for support with an audited `impersonatedBy` session
  field, replacing bespoke flows where they exist.

## 13. File map

New:

- `packages/better-auth-knex/` – adapter package, tests, README
- `ghost/core/core/server/services/auth/better-auth/create-auth.ts` – instance construction
- `ghost/core/core/server/services/auth/better-auth/plugins/session-bridge.ts` (temporary)
- `ghost/core/core/server/services/auth/better-auth/plugins/staff-lifecycle.ts`
- `ghost/core/core/server/services/auth/better-auth/plugins/device-verification.ts`
- `ghost/core/core/server/services/auth/better-auth/plugins/api-keys.ts` (legacy scheme)
- `ghost/core/core/server/services/auth/better-auth/plugins/sso.ts`
- `ghost/core/core/server/services/auth/better-auth/plugins/legacy-session.ts` (temporary)
- `ghost/core/core/server/services/auth/better-auth/errors.ts` – `APIError` to Ghost error mapping
- `ghost/core/core/server/services/auth/better-auth/README.md`
- `ghost/core/core/server/services/auth/principal.ts`, `resolve-principal.ts`
- `ghost/core/core/server/services/auth/policy/scopes.ts`, `token-policy.ts`
- `ghost/core/core/server/data/migrations/versions/<next>/…` – tables, columns, backfill
- `apps/admin-x-framework/src/auth/` – Better Auth client and plugin clients
- `apps/admin-x-framework/src/api/personal-access-tokens.ts`
- `apps/admin/src/auth/` – React sign-in, verification, reset, invitation, setup screens
- `apps/admin/src/settings/general/users/personal-access-tokens.tsx`, passkey and authenticator enrolment
- `ghost/core/test/e2e-api/admin/auth-native.test.js`, `bearer-tokens.test.js`, plugin and adapter unit tests

Changed:

- `pnpm-workspace.yaml` (catalog), `ghost/core/package.json`
- `ghost/core/core/boot.js` – `auth.init()`
- `ghost/core/core/server/web/api/endpoints/admin/app.js`, `middleware.js`, `routes.js`
- `ghost/core/core/server/web/api/endpoints/content/middleware.js`
- `ghost/core/core/server/web/parent/backend.js` – bridge, later SSO plugin mount
- `ghost/core/core/server/api/endpoints/session.js`, `authentication.js`, `users.js`
- `ghost/core/core/server/services/auth/index.js`, `authenticate.js`, `api-key/admin.js` (Bearer pass-through), `setup.js`, `passwordreset.js`, `reset-authentication.ts`
- `ghost/core/core/server/services/invitations/accept.js`, `services/integrations/integrations-service.js`, `services/internal-keys/index.ts`, `services/users.js`
- `ghost/core/core/server/models/user.js` (hash dual-write, session revocation seam), `models/api-key.js`
- `ghost/core/core/server/services/public-config/config.js`, `ghost/core/core/shared/config/defaults.json`, `ghost/core/core/shared/labs.js`
- `ghost/core/core/server/data/schema/schema.js`, `data/exporter/table-lists.js`, `test/unit/server/data/schema/integrity.test.js`
- `apps/admin/src/routes.tsx` (`EMBER_ROUTES`), `apps/admin-x-framework/src/api/session.ts`, `config.ts`
- `apps/ember-admin/app/controllers/signin.js` (only if Phase 1 sign-in options land in Ember)
- `docs/codebase/authentication.md`, `docs/codebase/direction.md`

Removed in Phase 8 / Ghost 7.0:

- `services/auth/session/express-session.js`, `session-store.js`, `session-from-token.ts`, `totp.ts`, `models/session.js`, the legacy `sessions` columns, `users.password`, `express-session`, `otplib`, auth-route `express-brute` usage, and (if confirmed) the permission tables.

Removed in Ghost 8.0:

- `api-key/admin.js`, `api-key/content.js` (if Content API keys are replaced), `better-auth/plugins/api-keys.ts`, `models/api-key.js`, the `api_keys` table, the Custom Integrations UI.
