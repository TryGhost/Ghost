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
types and policies (authenticator-app 2FA, passkeys, OIDC sign-in, scoped or
expiring API keys, an OAuth provider for integrations, session management UI)
should be Better Auth plugins that share one adapter, one hook pipeline and one
principal model, rather than new bespoke middleware.

Read the [authentication guide](../codebase/authentication.md) for the current
behaviour and the [codebase direction](../codebase/direction.md) for why Better
Auth is the intended foundation.

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

- **Better Auth becomes the engine for staff identity**: users, credential
  accounts, sessions, verification tokens, password hashing, password reset,
  and the request lifecycle (hooks, rate limits, cookies, origin checks).
- **Ghost keeps its database and conventions.** A Knex adapter written with
  Better Auth's `createAdapterFactory` runs against Ghost's existing Knex
  connection, 24-character ObjectId primary keys, `snake_case` columns and
  `created_at`/`updated_at` timestamps. Better Auth's model names are mapped
  onto Ghost tables (`users`, new `user_accounts`, new `user_sessions`, new
  `verifications`, existing `api_keys`).
- **Ghost-specific behaviour is written as Better Auth plugins**, not as
  forks of Better Auth's built-in plugins: sign-in verification by email code,
  API keys and staff tokens, staff lifecycle (setup, invitations, status
  policy), SSO adapter bridge, and a temporary legacy-session exchange.
- **Authorization stays in Ghost.** The permissions service (`canThis`, roles,
  permissions tables, model `permissible` hooks) is unchanged. The migration
  introduces one explicit `Principal` type that every credential resolves to,
  and `frame.options.context` is derived from it. The staff-token blocklist and
  integration allowlist move behind that seam as declarative policy.
- **Wire contracts are preserved by thin compatibility controllers.** The
  existing Admin API routes (`/session`, `/session/verify`,
  `/authentication/*`, `/users/:id/token`, `/integrations/:id/api_key/:keyid/refresh`)
  keep their paths, bodies, status codes, plain-text bodies, error codes and
  cookie name, and call Better Auth server-side. Better Auth's own endpoints
  are mounted at `/ghost/api/admin/auth/*` for the React Admin client.
- **Rollout is engine-switched by config** (`auth:engine`), shipped in phases
  that each leave `main` releasable, with the legacy engine removable in
  Ghost 7.0 together with SQLite support.

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
  `session_data.user_id` but leaves the row.
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
  the secret, so **the secret must remain recoverable server-side**; Better
  Auth's `apiKey` plugin hashes keys and requires a user, so it does not fit.
- Content API auth (`api-key/content.js`): `WHERE secret = ?`, type must be
  `content`. The key is public by design.
- Staff tokens authenticate as an API key but authorize as the user
  (`services/permissions/can-this.js`). `web/api/endpoints/admin/middleware.js`
  `tokenPermissionCheck` adds a staff-token blocklist (`DELETE /db`,
  `PUT /users/owner`, `POST /authentication/reset`) and an integration
  allowlist by resource and method.

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
  Integrations / staff    ┌──────────────────────────────────────────────┐ │  sessions, verification    │
  tokens / content keys ► │  resolvePrincipal middleware                 │ │  plugins (Ghost-owned):    │
  / cookie sessions       │  → req.auth: Principal                       │─│   ghostStaffLifecycle      │
                          │  → frame.options.context (unchanged shape)   │ │   ghostDeviceVerification  │
                          └──────────────────────────────────────────────┘ │   ghostApiKeys             │
                                                                          │   ghostSso                 │
                          ┌──────────────────────────────────────────────┐ │   ghostLegacySession (tmp) │
                          │  Authorization (unchanged): authorizeAdminApi│ │  adapter: Knex (Ghost DB)  │
                          │  permissions.canThis, token policy           │ └────────────────────────────┘
                          └──────────────────────────────────────────────┘
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
| Cookie | `advanced.cookies.session_token = { name: 'ghost-admin-api-session', attributes: { path, sameSite, secure, httpOnly } }` matching `express-session.js` exactly |
| Session lifetime | `session.expiresIn` = `admin:sessionMaxAgeMs / 1000`; `disableSessionRefresh: true` for parity with today's absolute expiry (revisit later) |
| Session fields | `session.additionalFields`: `verified` (boolean, `input: false`), `origin` (string, `input: false`) |
| User fields | `user.modelName: 'users'`, `fields: { image: 'profile_image', createdAt: 'created_at', updatedAt: 'updated_at', emailVerified: 'email_verified' }`, `additionalFields`: `status`, `slug`, `last_seen` (all `input: false`) |
| Accounts | `account.modelName: 'user_accounts'` with snake_case field mapping |
| Verification | `verification.modelName: 'verifications'` |
| Email + password | `enabled: true`, `disableSignUp: true`, `password: { hash, verify }` using bcrypt through `@tryghost/security` (see §4.4), `sendResetPassword` uses the existing `reset-password` mail template, `resetPasswordTokenExpiresIn: 86400`, `revokeSessionsOnPasswordReset: true`, `onPasswordReset` re-activates locked users |
| Origins | `trustedOrigins` as a function returning the admin origin and the site origin from `urlUtils` |
| IP | `advanced.ipAddress.ipAddressHeaders` aligned with Ghost's `trust proxy` setup |
| Rate limit | `rateLimit.enabled: false` while compatibility routes keep `express-brute`; enabled in Phase 8 |
| Disabled paths | `disabledPaths` for everything Ghost does not offer yet: `/sign-up/email`, `/update-user`, `/change-email`, `/delete-user`, social sign-in |
| Telemetry | `telemetry: { enabled: false }` |
| Logging | `logger.log` routed to `@tryghost/logging` |

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

### 3.3 Ghost plugins

Each is a `BetterAuthPlugin` under `services/auth/better-auth/plugins/`, with a
client counterpart in `apps/admin-x-framework` where the browser needs it.
Server-only endpoints are declared with `metadata: { SERVER_ONLY: true }` so
they are callable via `auth.api.*` but never exposed over HTTP.

**`ghostStaffLifecycle`**

- Before-hook on `/sign-in/email`: look up the user; `locked` → send the
  password reset email and throw an `APIError` whose body carries
  `errorType: 'PasswordResetRequiredError'`; `inactive` → throw with the
  existing suspended message; unknown email and wrong password map to the
  existing messages (see §5.3).
- After-hook on `/sign-in/email`: set `users.last_seen`, force `status` to
  `active` (today's `models.User.check` behaviour).
- `databaseHooks.session.create.before`: refuse sessions for users whose
  status is not active (defence in depth for every sign-in path, including
  SSO and legacy exchange).
- Server-only endpoints: `setupOwner` (replaces the password-setting part of
  `setup.js` `setupUser`), `acceptInvitation` (replaces
  `services/invitations/accept.js` user creation: validates the `invites`
  token, creates user + credential account + role in one transaction),
  `createVerifiedSession({userId, origin, ip, userAgent})` (used after
  password reset and self password change to replace
  `rotateAndAssignVerifiedUserToSession`), `revokeUserSessions({userId})`,
  `revokeAllSessions()`, `lockAllUsers()`.

**`ghostDeviceVerification`**

- Owns the "is this session verified" state and the email-code flow.
- After-hook on `/sign-in/email` (and on any endpoint that creates a session):
  decide `verified` for the new session:
  1. `security:staffDeviceVerification !== true` → verified.
  2. user has never logged in (`last_seen` null) → verified.
  3. request body carries a valid inline `token` → verified.
  4. `require_email_mfa` setting is false and the request carries a valid
     device-trust cookie for this user → verified.
  5. otherwise → unverified; generate and email a code; respond 403 with
     `code: '2FA_TOKEN_REQUIRED'` (setting on) or `'2FA_NEW_DEVICE_DETECTED'`.
- Global before-hook: any Better Auth endpoint that requires a session refuses
  an unverified session, except `/device-verification/*` and `/sign-out`.
  Without this, Better Auth endpoints such as `/change-password` would accept
  a session Ghost considers anonymous.
- Endpoints `POST /device-verification/send` and `POST /device-verification/verify`
  (`{ token }`). Codes are 6 random digits (not TOTP; the per-session
  challenge is replaced by a row in `verifications` keyed
  `device-verification:<sessionId>`, hashed value, 5-minute expiry, attempt
  counter). Successful verification sets `user_sessions.verified = true`, sets
  a signed device-trust cookie (`ghost-admin-device`, `httpOnly`, same
  attributes and lifetime as the session cookie, value bound to the user id)
  unless `require_email_mfa` is on, and deletes the verification row.
- After-hook on `/sign-out`: clear the device-trust cookie when
  `require_email_mfa` is on (today's `removeUserForSession` behaviour).
- Email rendering reuses `services/auth/session/emails/signin.js` and the
  device-details helper (user agent parsing and geolocation) moved into the
  plugin with an injectable lookup so tests do not hit the network.
- Designed so Better Auth's standard `twoFactor` and `passkey` plugins can be
  added later as additional factors: the "verified" predicate is one function
  that future factors extend.

**`ghostApiKeys`**

- Declares the schema over the existing `api_keys` table (`modelName: 'api_keys'`,
  snake_case mapping). No new columns initially; later columns
  (`name`, `expires_at`, `scopes`, `last_used_at`) are added through this
  plugin plus a Ghost migration.
- Server-only endpoints, each a straight port of today's logic with the same
  error codes: `verifyAdminToken({ token, url, ignoreMaxAge })` → `{ apiKey, user | null }`
  (kid lookup, `type === 'admin'`, hex-decoded secret, HS256, `aud` path
  regex, 5-minute `maxAge`, `customIntegrations` limit check, active user for
  staff tokens); `verifyContentKey({ key })`; `getOrCreateStaffToken({ userId })`;
  `rotateSecret({ id })`; `rotateAllSecrets()`; `getInternalKey({ slug })`.
  Use `jose` (already in the catalog and a Better Auth dependency) for JWT
  verification, keeping `jsonwebtoken` only where tokens are signed until those
  call sites are converted.
- Enforces the role rules that `models/api-key.js` `onSaving` enforces today
  (admin keys get the `Admin Integration` role unless one is given, content
  keys have no role) and records the `refreshed` action on rotation.
- Exposes an `authorizationPolicy` used by `resolvePrincipal`: staff-token
  blocklist and integration allowlist, declared as data so scoped keys can
  extend it later.

**`ghostSso`**

- Replaces `services/auth/session/session-from-token.ts` and the
  `createSessionFromToken()` wiring in `session/index.js`. Keeps the
  `@tryghost/adapter-base-sso` contract (`getRequestCredentials`,
  `getIdentityFromCredentials`, `getUserForIdentity`, injected user
  repository) so hosted adapters keep working, but creates the session through
  `internalAdapter.createSession` and marks it verified.
- Mounted on `/ghost` as today (`web/parent/backend.js`).

**`ghostLegacySession`** (temporary, removed in Phase 8)

- If the `ghost-admin-api-session` cookie value has the `express-session`
  shape (`s:<sid>.<signature>`), verify the signature with
  `admin_session_secret`, load the `sessions` row, and if it holds an active
  `user_id`, create a Better Auth session for that user with `verified`
  copied from the legacy blob (only when `verified_user_id === user_id`), set
  the new cookie and the device-trust cookie when verified, and delete the
  legacy row. Invalid or unknown legacy cookies are treated as anonymous.
- Runs inside `resolvePrincipal` before `auth.api.getSession`, so staff are
  not logged out by the cutover.

### 3.4 Principal and request resolution

New `services/auth/principal.ts`:

```ts
type Principal =
  | { kind: 'user'; method: 'session' | 'staff_token' | 'sso'; user: User; session?: Session; apiKey?: ApiKey }
  | { kind: 'integration'; method: 'admin_api_key' | 'content_api_key'; apiKey: ApiKey; integration: Integration | null }
  | { kind: 'internal' }
  | { kind: 'anonymous' };
```

`services/auth/resolve-principal.ts` replaces `authenticate.js`:

1. `Authorization: Ghost <JWT>` → `auth.api.verifyAdminToken` → user or
   integration principal (staff tokens produce `kind: 'user'`,
   `method: 'staff_token'`, keeping `apiKey` for audit attribution).
2. Otherwise a cookie → legacy exchange if needed → `auth.api.getSession({ headers })`
   → origin pinning check (`session.origin` vs request origin, honouring
   `res.locals.bypassCsrfProtection`) → user principal only when
   `session.verified` is true, else anonymous. This preserves today's
   "unverified equals anonymous" behaviour.
3. Content API: `?key=` → `auth.api.verifyContentKey`; then the existing
   members token middleware (unchanged).

`req.user`, `req.api_key` and `frame.options.context` (`{ internal, user,
api_key, integration, member, public }`) are derived from `req.auth` so
`authorizeAdminApi`, `updateUserLastSeen`, `parseContext`, `canThis`, model
`permissible` hooks and audit attribution keep working without changes.
Because API-framework code and many tests read `req.user`/`req.api_key` as
Bookshelf models, the resolver loads those models by id during the transition;
the `Principal` carries plain records for new TypeScript code.

### 3.5 Express mounting

In `web/api/endpoints/admin/app.js`, before `bodyParser.json`:

```js
apiApp.all('/auth/*', toNodeHandler(auth)); // Express 4 wildcard syntax
```

Compatibility routes stay in `routes.js` and keep their `express-brute`
middleware. `mw.authAdminApi` swaps `auth.authenticate.authenticateAdminApi`
for `resolvePrincipal` when `auth:engine` is `better-auth`.

## 4. Data model and migrations

All changes are additive until Ghost 7.0. Every migration is created with
`pnpm migrate:create`, updates `schema.js`, the integrity hashes in
`test/unit/server/data/schema/integrity.test.js`, and `data/exporter/table-lists.js`.

### 4.1 New tables

`user_accounts` (Better Auth `account`; classified as a backup table):

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

`user_sessions` (Better Auth `session`; backup table):

| column | type | notes |
| --- | --- | --- |
| `id` | string(24) pk | |
| `user_id` | string(24), not null, index | references `users.id`, cascade delete |
| `token` | string(191), not null, unique | |
| `expires_at` | dateTime, not null, index | |
| `ip_address` | string(45), nullable | |
| `user_agent` | string(2000), nullable | |
| `origin` | string(2000), nullable | CSRF origin pinning |
| `verified` | boolean, not null, default false | device verification |
| `created_at`, `updated_at` | dateTime | |

`verifications` (Better Auth `verification`; backup table):

| column | type | notes |
| --- | --- | --- |
| `id` | string(24) pk | |
| `identifier` | string(191), not null, index | e.g. `reset-password:<token>` |
| `value` | text, not null | |
| `expires_at` | dateTime, not null, index | |
| `created_at`, `updated_at` | dateTime | |

`rate_limits` (Phase 8 only, when Better Auth rate limiting replaces
`express-brute` for auth paths; backup table): `id`, `key` (unique),
`count`, `last_request` (bigInteger).

A new table is used for sessions instead of adding columns to `sessions`
because the two engines have incompatible row shapes, the legacy exchange
needs to read legacy rows while writing new ones, and `sessions` can be
dropped wholesale in Ghost 7.0.

### 4.2 Changes to existing tables

- `users.email_verified` boolean, not null, default `true` (Better Auth core
  field; existing staff have proven their address through invitation or
  setup). Mapped from `emailVerified`.
- `users.password` stays until Ghost 7.0 and is kept identical to the
  credential account hash (see §4.4).
- `api_keys`: unchanged in this plan. Future plugin columns are additive.

### 4.3 Backfill migration

A transactional migration inserts one `user_accounts` row per user
(`provider_id = 'credential'`, `account_id = user.id`, `password = users.password`).
It is idempotent (skips users that already have a credential row) and logs
counts. It runs after the table migrations in the same version folder.

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
deletes expired `user_sessions` and `verifications`, replacing nothing (today's
`sessions` rows are never purged).

### 4.6 Ghost 7.0 removals

Drop `sessions`, drop `users.password`, remove `express-session`,
`express-brute` for auth routes, `otplib`, and `jsonwebtoken` where `jose`
replaced it. Decide then whether `user_accounts` credential rows are part of
content exports (today `users.password` is exported).

## 5. Compatibility contract

These are the behaviours the migration must not change. They are covered by
existing tests listed in §7, which must pass unchanged under both engines.

### 5.1 HTTP surface

| Route | Request | Response today | Notes |
| --- | --- | --- | --- |
| `POST /session` | `{ username, password, token? }` | `201` text `Created`, `Set-Cookie: ghost-admin-api-session=...`; `403` JSON with `code` `2FA_TOKEN_REQUIRED` / `2FA_NEW_DEVICE_DETECTED`, `type` `Needs2FAError`; `401 Access Denied.` on missing fields; `404 There is no user with that email address.`; `422` `PASSWORD_INCORRECT` `Your password is incorrect.`; `PasswordResetRequiredError` for locked users (and a reset email is sent); `429 TooManyRequestsError` | Calls `auth.api.signInEmail` with `returnHeaders` and forwards `Set-Cookie` |
| `DELETE /session` | cookie | `204` | `auth.api.signOut` |
| `POST /session/verify` | cookie, no body | `200` text `OK` | `/device-verification/send` |
| `PUT /session/verify` | `{ token }` | `200` text `OK`, bare `401` on wrong code | `/device-verification/verify` |
| `POST /authentication/password_reset` | `{ password_reset: [{ email }] }` | `{ password_reset: [{ message: 'Check your email for further instructions.' }] }`; suspended users refused | `auth.api.requestPasswordReset`; the email link keeps the shape `<admin>/reset/<token>/` |
| `PUT /authentication/password_reset` | `{ password_reset: [{ newPassword, ne2Password, token }] }` | `{ password_reset: [{ message: 'Password updated' }] }` plus a verified session cookie; expired/used/corrupt token messages | `auth.api.resetPassword` then `createVerifiedSession`; legacy stateless tokens accepted for 24 hours after cutover |
| `POST /authentication/setup`, `PUT /authentication/setup`, `GET /authentication/setup` | unchanged | unchanged | `setupOwner` for the password step |
| `POST /authentication/invitation`, `GET /authentication/invitation` | unchanged | unchanged | `acceptInvitation` |
| `POST /authentication/reset` | cookie | `{ security_action: [...] }` | rotates keys, locks users, revokes all sessions |
| `PUT /users/password` | `{ password: [{ oldPassword, newPassword, ne2Password, user_id }] }` | unchanged, other sessions revoked, own session rotated and verified | `auth.api.changePassword` semantics via server-side call, then `createVerifiedSession` |
| `GET/PUT /users/:id/token` | cookie | `{ apiKey: {...} }` | `getOrCreateStaffToken`, `rotateSecret` |
| `POST /integrations/:id/api_key/:keyid/refresh`, `POST /integrations` | unchanged | unchanged | `rotateSecret`; integration creation still generates `content` + `admin` keys |
| `GET /users/me/` | cookie or staff token | `200` when authenticated, `403 Authorization failed` otherwise | Ember's session probe |
| Admin API with `Authorization: Ghost <JWT>` | HS256, `kid`, `aud` | same error codes: `INVALID_AUTH_HEADER`, `INVALID_JWT`, `MISSING_ADMIN_API_KID`, `UNKNOWN_ADMIN_API_KEY`, `INVALID_API_KEY_TYPE` | |
| Content API `?key=` | | `UNKNOWN_CONTENT_API_KEY`, `INVALID_API_KEY_TYPE`, `INVALID_REQUEST` | |
| `GET /ghost/auth-frame` | cookie | served only when the cookie header contains `ghost-admin-api-session` | cookie name preserved |

### 5.2 Cookie

Name `ghost-admin-api-session`, `httpOnly`, path `<subdir>/ghost`,
`sameSite`/`secure` derived from the site URL exactly as today, lifetime
180 days by default from `admin:sessionMaxAgeMs`.

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
  login and clears device trust on logout; `security:staffDeviceVerification`
  false disables it.
- Origin pinning per session, admin-origin check per request,
  `res.locals.bypassCsrfProtection` honoured.
- Password change or reset revokes every other session of the user and leaves
  the current browser verified. Authentication reset revokes every session.
- Locked users can reset; inactive users cannot sign in or reset.
- Staff tokens are rejected on the three blocklisted operations; integration
  tokens are restricted to the allowlist.
- Scheduler URL tokens ignore `maxAge` but honour `exp`/`nbf`.
- `last_seen` updated on login; `updateUserLastSeen` unchanged.
- Audit attribution (`actions` rows) distinguishes staff tokens from
  integration tokens.

## 6. Phases

Each phase ends with `pnpm check` green on MySQL and SQLite, the e2e API suite
green under both engines where applicable, and a short update to
[authentication.md](../codebase/authentication.md). Sizes are rough relative
estimates for one engineer.

### Phase 0: Spikes and decisions (S)

Goal: remove the unknowns before writing production code.

1. Loading spike: `require('better-auth')`, `better-auth/node`,
   `better-auth/plugins` and `better-auth/adapters` from a CommonJS TypeScript
   file in `ghost/core` on Node 22 and 24. Fall back to `await import()` in
   the service `init()` if `require(esm)` hits a top-level-await module.
2. Adapter spike: minimal Knex adapter passing Better Auth's adapter test
   suite against SQLite and MySQL (`docker/` MySQL). Confirm date, boolean and
   JSON handling and the ObjectId generator hook.
3. API confirmation: `metadata.SERVER_ONLY` endpoints, `returnHeaders` on
   `auth.api.signInEmail`, `advanced.cookies.session_token` attributes with a
   path, `session.additionalFields` with `input: false`, `ctx.context.newSession`
   in after-hooks, `internalAdapter.createSession` + `setSessionCookie`.
   Record exact names in the plugin READMEs.
4. Security review of the design in §3.3 with whoever owns Ghost security
   (unverified-session gate, device-trust cookie, legacy exchange, origin
   pinning, secret reuse).
5. Confirm the decisions in §10. Update `direction.md` status for
   authentication from "Exploring" to "Active migration" when Phase 1 starts.

Exit: written notes in `services/auth/better-auth/README.md`; go/no-go.

### Phase 1: Foundations (M)

Goal: Better Auth exists at boot, persists to Ghost's database, and nothing
user-visible changes.

1. Add `better-auth` to the catalog in `pnpm-workspace.yaml`; depend on it
   from `ghost/core` and from the new adapter package.
2. Create `packages/better-auth-knex` from `packages/_template` with the
   adapter, its test suite, and a README.
3. Migrations (one version folder): `user_accounts`, `user_sessions`,
   `verifications`, `users.email_verified`, credential backfill. Update
   `schema.js`, exporter table lists, integrity hashes. Run the migration
   integration test forwards, rollback and forwards on both databases.
4. `services/auth/better-auth/create-auth.ts` with the configuration in §3.1
   and no plugins yet; `init()` called from `boot.js` after the database and
   settings cache are ready. Not mounted on HTTP.
5. Dual-write of password hashes (§4.4) behind the engine flag being present
   at all, so both columns stay in sync from this phase on.
6. Add config `auth:engine` (`legacy` default) to `defaults.json` and the
   config docs; expose `config.auth = { engine }` from
   `services/public-config/config.js` (do not place it under `security`).

Exit: fresh installs and upgrades run the migrations; `pnpm check` green; no
behaviour change with `auth:engine = legacy`.

### Phase 2: Sessions and password sign-in behind the flag (L)

Goal: with `auth:engine = better-auth`, staff can sign in and use Admin with
cookies, existing sessions survive, and the API-key path is untouched.

1. Implement `ghostStaffLifecycle` (status policy, `last_seen`, session
   guard) and `ghostLegacySession`.
2. Mount the Better Auth handler in `admin/app.js` before body parsing.
3. Implement `Principal`, `resolvePrincipal`, and derive `req.user`,
   `req.api_key`, `frame.options.context` from it. Wire into
   `mw.authAdminApi`, `mw.authAdminApiWithUrl`, and the Content API
   middleware when the flag is on. The API-key branch still calls the existing
   `api-key/admin.js` in this phase.
4. Compatibility controllers for `POST /session` and `DELETE /session` in
   `api/endpoints/session.js`, selected by engine. Keep `express-brute`
   middleware and the `req.brute.reset()` on success.
5. Session revocation seams: `models/user.js` `changePassword`,
   `services/users.js` suspension and destroy paths, and
   `reset-authentication.ts` call `revokeUserSessions`/`revokeAllSessions`
   through `services/auth` so they cover both `sessions` and `user_sessions`
   while both exist. Suspending or deleting a user now revokes sessions
   (today they linger).
6. `PUT /users/password` and `PUT /authentication/password_reset` use
   `createVerifiedSession` for the current browser under the new engine.
7. Cleanup job for expired sessions and verifications.
8. Run `test/e2e-api/admin/session.test.js`, `session-invalidation.test.js`,
   `users.test.js`, `api-tokens.test.js`, `key-authentication.test.js` and the
   `e2e/tests/admin/signin.test.ts` browser test under the new engine.

Exit: parity for sign-in, sign-out, session expiry, revocation and origin
pinning with `security:staffDeviceVerification = false`.

### Phase 3: Sign-in verification by email code (M)

1. Implement `ghostDeviceVerification` per §3.3, including the unverified
   session gate on Better Auth endpoints and the device-trust cookie.
2. Compatibility controllers for `POST /session/verify` and
   `PUT /session/verify`, including the inline `token` on `POST /session`.
3. Move the sign-in email template and device-details helper into the plugin;
   keep the subject `<code> is your Ghost sign in verification code` (the
   browser tests read it).
4. Legacy exchange sets device trust for verified legacy sessions so the
   cutover does not re-prompt everyone.
5. Run the `Staff 2FA` block of `session.test.js`, `sso.test.js`,
   `rate-limiting.test.js`, and `e2e/tests/admin/two-factor-auth.test.ts`
   with `security__staffDeviceVerification=true`.

Exit: identical client experience for new-device verification and
`require_email_mfa`.

### Phase 4: Password lifecycle, setup and invitations (M)

1. `POST /authentication/password_reset` → `requestPasswordReset` with
   Ghost's mail template and URL shape; `PUT` → `resetPassword`, accepting the
   legacy stateless token format for 24 hours after cutover, then verified
   session creation and `express-brute` reset as today.
2. `setupOwner` and `acceptInvitation` endpoints; `services/auth/setup.js`
   and `services/invitations/accept.js` call them under the new engine.
   Invitation tokens stay in `invites` (moving them to `verifications` is a
   later option).
3. `PasswordResetRequiredError` flow for locked users, including the automatic
   reset email.
4. Run `authentication.test.js`, `invites.test.js`, the legacy
   `test/legacy/api/admin/authentication.test.js`, and
   `e2e/tests/admin/reset-password.test.ts`, `staff-role-smoke.test.ts`,
   `settings/danger-zone.test.ts`.

Exit: `@tryghost/security` reset-token helpers are only used by the legacy
engine and the 24-hour compatibility window.

### Phase 5: API keys and staff tokens as a plugin (M)

1. Implement `ghostApiKeys` per §3.3 and switch `resolvePrincipal` to
   `verifyAdminToken`/`verifyContentKey` under the new engine.
2. Move the staff-token blocklist and integration allowlist from
   `admin/middleware.js` `tokenPermissionCheck` into the plugin's policy;
   `tokenPermissionCheck` becomes a thin caller.
3. `users.js` staff-token endpoints, `integrations-service.js` key refresh and
   `models/api-key.js` `refreshAllSecrets` call plugin endpoints.
   `services/internal-keys` reads through `getInternalKey` and keeps its
   process cache and `.clear()` contract.
4. Keep `last_seen_at`/`last_seen_version` updates.
5. Run `api-tokens.test.js`, `key-authentication.test.js`,
   `integrations.test.js`, `test/e2e-api/content/key-authentication.test.js`,
   `test/unit/server/web/api/admin/middleware.test.js`, and the scheduler
   publish tests.

Exit: no request path reads `api_keys` outside the plugin, except Bookshelf
reads for the integrations Admin API responses.

### Phase 6: Unified principal, SSO and documentation (S)

1. `ghostSso` replaces `session-from-token.ts` wiring; `DefaultSSOAdapter`
   unchanged. Verify `sso.test.js` and a hosted-adapter smoke test.
2. Audit every reader of `req.user`, `req.api_key`, `frame.user` and
   `frame.original.session` (notably `api/endpoints/users.js`,
   `authentication.js`, `packages/api-framework/lib/http.js`) and make them
   read from the principal.
3. Document extension points: how to add a plugin, where policy lives, how to
   add a credential column. Update `authentication.md` to describe the new
   engine as current behaviour and the legacy engine as removable.

### Phase 7: React Admin sign-in on Better Auth (L, parallel with 4–6)

1. Add `better-auth/client` to `apps/admin-x-framework` with
   `createAuthClient({ baseURL: <apiRoot>/auth, plugins: [ghostDeviceVerificationClient()] })`
   and client plugins for the Ghost endpoints. Feature-detect with
   `config.auth.engine`; fall back to the existing `useAddSession` family
   against older servers.
2. Build React sign-in, verification, password reset, invitation and setup
   screens in `apps/admin/src/auth/` per the Ember-to-React direction, using
   Shade. Remove those routes from `EMBER_ROUTES` once shipped behind an
   Admin flag. Keep the `Authorization failed` and 401 handling in
   `fetch-api.ts` and `handle-response.ts` as they are.
3. Add session management UI later using Better Auth's `listSessions` and
   `revokeSession` once the unverified-session gate is in place.
4. Ember keeps using the compatibility routes until it is removed.

### Phase 8: Default flip, hardening, legacy removal (M, spread over releases)

1. Flip `auth:engine` default to `better-auth` in a minor release; note in
   release notes that no re-login is required.
2. Enable Better Auth rate limiting with `storage: 'database'` (or the Redis
   secondary storage via the cache adapter on Ghost(Pro)) and `customRules`
   mirroring `spam.user_login`, `user_reset`, `user_verification`,
   `send_verification_code`, `global_reset`; remove `express-brute` from the
   compatibility routes only when the native endpoints have equivalent limits
   and success resets (or accept Better Auth's fixed-window semantics, see §9).
3. After one release with no incidents: remove the legacy engine, the
   `ghostLegacySession` plugin, `express-session`, `session-store.js`,
   `models/session.js`, `totp.ts`, the legacy reset-token window, and the
   `auth:engine` config key.
4. Ghost 7.0: migrations in §4.6.

## 7. Testing strategy

- **Adapter**: Better Auth's adapter suite in `packages/better-auth-knex`
  (vitest) against SQLite locally and MySQL in CI, plus Ghost-specific cases
  (ObjectId ids, `dateTime` round-trips, JSON in text columns, transactions).
- **Plugins**: unit tests per plugin with an in-memory Better Auth instance
  and the memory adapter, covering every branch of the verification decision,
  the unverified-session gate, error mapping, JWT verification (kid, aud,
  maxAge, hex secret, `nbf`), staff-token blocklist and integration allowlist.
- **Contract tests**: the existing `test/e2e-api/admin` and
  `test/e2e-api/content` suites are the compatibility oracle. Run them in CI
  under both engines (`auth__engine` environment variable) until the legacy
  engine is removed. Snapshot files change only where a body legitimately
  changes; the session snapshots (`set-cookie` prefix, 2FA error body) must
  not change.
- **Native endpoint tests**: new e2e tests for `/ghost/api/admin/auth/*`
  covering sign-in, sign-out, verification, reset, disabled paths returning
  404, and unverified-session refusal on protected endpoints.
- **Migration tests**: `test/integration/migrations/migration.test.js` forwards,
  rollback and idempotency on both databases; a backfill test with users that
  already have credential rows.
- **Browser tests**: `e2e/tests/admin/signin.test.ts`, `two-factor-auth.test.ts`,
  `reset-password.test.ts`, `staff-role-smoke.test.ts`, `settings/danger-zone.test.ts`
  under the new engine; new tests for the React sign-in screens in Phase 7.
- **Upgrade test**: start Ghost on the legacy engine, sign in (verified),
  switch engine, confirm the next request exchanges the cookie and the user is
  neither logged out nor re-prompted; switch back and confirm sign-in still
  works.
- **Security checks**: cloned pre-change cookie rejected after password
  change; verified state cannot transfer between users; wrong-origin requests
  rejected; content key cannot hit Admin API; admin key cannot hit Content
  API; staff token blocklist; unverified session cannot call
  `/auth/change-password`.
- **Static**: `pnpm check` (lint, typecheck, unit tests) plus `pnpm lint:packages`
  for the new package.

## 8. Rollout, flags and rollback

- `auth:engine` config (`legacy` | `better-auth`) selects middleware and
  controllers at boot. It is config rather than a labs flag because it rewires
  Express at boot and must be set per deployment by operators or by Ghost(Pro)
  tooling, not toggled in the Admin UI.
- Ghost(Pro) rollout: internal sites, then a small cohort, then all, with
  the upgrade test in §7 as the gate. Self-hosted: default flip in a minor
  release after Ghost(Pro) has run it.
- React Admin feature-detects `config.auth.engine` so an Admin build ahead of
  the server keeps using compatibility routes.
- Rollback: set `auth:engine = legacy`. Sessions created by Better Auth have
  no legacy row, so affected staff sign in again; passwords keep working
  because hashes are dual-written; API keys are untouched.
- Monitoring: log and count sign-in outcomes, verification sends and
  failures, legacy exchanges, and Better Auth `onAPIError` events; alert on
  sign-in failure rate changes during rollout.

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Better Auth is ESM-only and Ghost Core is CommonJS | Phase 0 loading spike; dynamic `import()` in `init()` as fallback; new code is TypeScript that can move to ESM later |
| Two access paths to `api_keys` (Bookshelf and adapter) during transition | Plugin owns all writes; Bookshelf reads only for API responses; remove model writes in Phase 5 |
| Legacy session exchange bugs log staff out or, worse, upgrade an unverified legacy session | Copy `verified` only when `verified_user_id === user_id`; exchange only active users; unit tests on signature verification; forced re-login is the fallback (§10) |
| Unverified Better Auth session accepted by Better Auth's own endpoints | Global before-hook gate in `ghostDeviceVerification`; e2e test |
| Better Auth's rate limiter has fixed windows and no success reset, unlike `express-brute` | Keep `express-brute` on compatibility routes until Phase 8; implement a custom `rateLimit.customStorage` with reset-on-success if parity matters |
| Stateful reset tokens change invalidation semantics | `revokeSessionsOnPasswordReset`, single-use rows, 24-hour expiry, `onPasswordReset` deletes other outstanding reset rows for the user |
| Cookie name or `Authorization failed` message drift breaks clients | Both are in the compatibility contract (§5) and asserted by snapshots |
| `config.security` is exposed verbatim to staff | New config lives under `auth:`; only `engine` is published |
| Geolocation lookup in the sign-in path | Kept behind an injectable provider with the existing 500 ms timeout |
| Better Auth upgrades change plugin APIs | Pin the catalog version; adapter and plugin suites run in CI; upgrade as a deliberate task |
| Importer/exporter of password hashes | `users.password` stays the exported field until 7.0; importer writes both columns |

## 10. Decisions to confirm before Phase 1

1. **Legacy session exchange vs forced re-login at cutover.** Recommended:
   exchange (no staff disruption, small plugin). Alternative: delete legacy
   sessions at flip and announce a one-time re-login.
2. **New `user_sessions` table vs evolving `sessions`.** Recommended: new
   table (§4.1 rationale).
3. **Session lifetime semantics.** Recommended: keep absolute 180 days
   (`disableSessionRefresh: true`) for parity; consider rolling refresh later.
4. **Verification code generation.** Recommended: random 6-digit codes stored
   hashed in `verifications` with an attempt counter, replacing the TOTP
   derivation. Alternative: keep the TOTP derivation inside the plugin for
   byte-for-byte parity.
5. **Config key name and location.** Recommended: `auth:engine`.
6. **Table names.** Recommended: `user_accounts`, `user_sessions`,
   `verifications`, `rate_limits`.
7. **Whether `user_accounts` credential rows join content exports in 7.0.**

## 11. Out of scope

- Members authentication (magic links, OTC, member sessions and identity
  tokens). It shares only `authenticate.js` composition with staff auth and
  is a separate migration candidate (Better Auth's `magicLink`/`emailOTP`
  plugins) once the staff engine is stable.
- Replacing the permissions engine (`canThis`, roles and permissions tables,
  model `permissible` hooks). The principal seam is the only authorization
  change.
- Identity tokens (`GET /identities`, RS256, JWKS) and the Tinybird and
  Featurebase token endpoints. Candidates for Better Auth's `jwt` plugin later.
- Webhook secrets, theme session secret, private-site auth.

## 12. Extension catalogue

What the plugin model enables after the migration, each as an additive plugin
plus a migration where new columns are needed:

- Authenticator-app 2FA and backup codes via Better Auth `twoFactor`, with the
  device-verification plugin treating a verified TOTP as a satisfied factor.
- Passkeys via the `passkey` plugin.
- OIDC or SAML staff sign-in via `genericOAuth`/`sso`, replacing the bespoke
  SSO adapter with a standard flow while keeping the adapter contract for
  hosted deployments.
- Scoped, named and expiring Staff Access Tokens and integration keys through
  `ghostApiKeys` schema and policy extensions.
- An OAuth 2.0 provider so third-party apps can act on behalf of a staff user
  without sharing Admin API keys.
- Session management UI (list and revoke devices) from `listSessions` and
  `revokeSession`.
- Staff login event audit trail via `databaseHooks.session.create.after`.
- Organisation or multi-site staff identity via the `organization` plugin on
  Ghost(Pro).
- Migrating identity tokens to the `jwt` plugin and members sign-in to
  `magicLink`/`emailOTP`.

## 13. File map

New:

- `packages/better-auth-knex/` – adapter package, tests, README
- `ghost/core/core/server/services/auth/better-auth/create-auth.ts` – instance construction
- `ghost/core/core/server/services/auth/better-auth/plugins/staff-lifecycle.ts`
- `ghost/core/core/server/services/auth/better-auth/plugins/device-verification.ts`
- `ghost/core/core/server/services/auth/better-auth/plugins/api-keys.ts`
- `ghost/core/core/server/services/auth/better-auth/plugins/sso.ts`
- `ghost/core/core/server/services/auth/better-auth/plugins/legacy-session.ts`
- `ghost/core/core/server/services/auth/better-auth/errors.ts` – `APIError` to Ghost error mapping
- `ghost/core/core/server/services/auth/better-auth/README.md`
- `ghost/core/core/server/services/auth/principal.ts`, `resolve-principal.ts`
- `ghost/core/core/server/data/migrations/versions/<next>/…` – tables, column, backfill
- `apps/admin-x-framework/src/auth/` – Better Auth client and plugin clients
- `apps/admin/src/auth/` – React sign-in, verification, reset, invitation, setup screens
- `ghost/core/test/e2e-api/admin/auth-native.test.js`, plugin and adapter unit tests

Changed:

- `pnpm-workspace.yaml` (catalog), `ghost/core/package.json`
- `ghost/core/core/boot.js` – `auth.init()`
- `ghost/core/core/server/web/api/endpoints/admin/app.js`, `middleware.js`, `routes.js`
- `ghost/core/core/server/web/api/endpoints/content/middleware.js`
- `ghost/core/core/server/web/parent/backend.js` – SSO plugin mount
- `ghost/core/core/server/api/endpoints/session.js`, `authentication.js`, `users.js`
- `ghost/core/core/server/services/auth/index.js`, `authenticate.js`, `setup.js`, `passwordreset.js`, `reset-authentication.ts`
- `ghost/core/core/server/services/invitations/accept.js`, `services/integrations/integrations-service.js`, `services/internal-keys/index.ts`, `services/users.js`
- `ghost/core/core/server/models/user.js` (hash dual-write, session revocation seam), `models/api-key.js`
- `ghost/core/core/server/services/public-config/config.js`, `ghost/core/core/shared/config/defaults.json`
- `ghost/core/core/server/data/schema/schema.js`, `data/exporter/table-lists.js`, `test/unit/server/data/schema/integrity.test.js`
- `apps/admin/src/routes.tsx` (`EMBER_ROUTES`), `apps/admin-x-framework/src/api/session.ts`, `config.ts`
- `docs/codebase/authentication.md`, `docs/codebase/direction.md`

Removed in Phase 8 / Ghost 7.0:

- `services/auth/session/express-session.js`, `session-store.js`, `session-from-token.ts`, `totp.ts`, `models/session.js`, the `sessions` table, `users.password`, `express-session`, `otplib`, auth-route `express-brute` usage.
