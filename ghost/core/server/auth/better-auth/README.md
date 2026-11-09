# Better Auth

Staff authentication on [Better Auth](https://www.better-auth.com), behind the
`auth:engine` config key. See the
[migration plan](../../../../../docs/plans/better-auth-migration.md)
for the design.

## Engine

`auth:engine` is `legacy` (default) or `better-auth`. Under `legacy` boot never
loads Better Auth or reads its tables, so Ghost runs without them. Under
`better-auth` boot builds the instance after settings and refuses to start on
SQLite or where in-development tables are off (`createInDevelopmentTables`
outside development and testing). Boot creates those tables before it builds
the instance, so the check reads config rather than the database; it becomes a
real table check, or goes away, when the tables get a migration. Nothing
mounts its handler yet.

- `create-auth.ts`: `createAuth()` builds the instance with Ghost's options
  (plan §3.1) from injected dependencies; `assertDatabaseSupported()` is the
  boot check above.
- `index.ts`: the boot-owned service root, exposed as `auth.betterAuth`. Boot
  calls `init()`; consumers read `.service`.

Ghost mounts at the subdirectory, so on a subdirectory install requests reach
Better Auth as `/blog/ghost/api/admin/auth/...`. `basePath` therefore carries
the subdirectory, and `baseURL` is the admin origin only, because Better Auth
ignores `basePath` when `baseURL` has a path.

The session cookie is `ghost-admin-api-session` with the legacy path and
`httpOnly`. When the admin URL is HTTPS, `useSecureCookies` makes it `Secure`
and names it `__Secure-ghost-admin-api-session`, so a browser only accepts it
over HTTPS, and `sameSite` is `none`; otherwise it is `lax`. Unlike the legacy
cookie this follows the admin URL rather than the site URL, since the cookie
lives on the admin origin: an HTTPS site with an HTTP admin URL still gets a
cookie the browser accepts. It is not `__Host-`, which would need `Path=/` and
send the admin session with every frontend request. Its `maxAge` is Better
Auth's, in seconds, from `expiresIn`. The auth frame (`web/admin/app.js`)
accepts either name.

Better Auth reads the client IP, for session rows and its rate limiter, only
from request headers. A client can set any header, so Ghost points
`advanced.ipAddress.ipAddressHeaders` at its own `x-ghost-client-ip`, which
`setClientIPHeader` (`client-ip.ts`) overwrites with Express's `req.ip` as
`trust proxy` resolved it. Mount it before any route that hands request headers
to Better Auth. `ipv6Subnet: 64` and `normalizeIP` in Ghost's `BackoffLimiter`
format an address the same way, so both count a client against the same key.
IPv6 counts per /64, the block a single subscriber usually holds.

- `knex-adapter.ts`: a Better Auth database adapter over a Knex instance. It
  imports nothing from Ghost, so it can become a package later. Ghost
  migrations own the DDL, so there is no `createSchema`. It generates no ids:
  it needs `advanced.database.generateId`, and Ghost passes `generateGhostId`
  (ObjectIds) from `ghost-models.ts`.
- `ghost-models.ts`: maps Better Auth's `user`, `session`, `account` and
  `verification` models onto `users`, `user_sessions`, `user_accounts` and
  `verifications`, plus the `users` gaps described below.
- `seed-credential-accounts.ts`: gives each user a `credential` row in
  `user_accounts` with the hash from `users.password` (plan §4.4). Boot runs
  it wherever the in-development tables are created (development and testing
  with `createInDevelopmentTables`); it skips users that already have one.

## Tables

`user_accounts`, `user_sessions` and `verifications` are defined in
`schema.js` and listed in `IN_DEVELOPMENT_TABLES`, so they exist only in
development and testing databases and have no migration yet. Their dates are
`DATETIME(3)` (the `precision` column option), because Better Auth expects
dates to round-trip with their milliseconds.

`user_two_factors`, the `twoFactor` plugin's model, is an in-development table
too, ahead of the plugin (plan §5). It holds TOTP secrets and backup codes, so
like the other three it is left out of exports by default.

## Columns `users` does not have

Better Auth's `user` model expects `emailVerified` (and `twoFactorEnabled`
with the `twoFactor` plugin), which `users` does not store. Rather than alter
`users` (plan §4.3), the adapter's `virtualColumns` option serves them as SQL
expressions: reads, filters and sorts use the expression, and writes to them
are dropped. `email_verified` is always `1`. That is not proof of the address
(the owner's email at setup is never verified), so no enabled flow may trust
it; plan §4.3 covers when that changes. `two_factor_enabled` is whether the user has a
verified `user_two_factors` row, and only applies once the `twoFactor` plugin
adds the field. `user.fields` only renames Better Auth's core fields, so the
plugin needs `ghostTwoFactorSchema` passed as its `schema` option.

The reverse also holds: `users.slug` and `users.password` are `NOT NULL` and
Better Auth never sets them. The adapter's `createDefaults` option fills them
on insert: the slug is the id, and the password is `!`, which is never a valid
bcrypt hash, so the legacy check rejects it. Ghost disables Better Auth sign-up,
so this only matters once Better Auth provisions users (SSO, Phase 8).

## Adapter suite

`test/integration/auth/knex-adapter.test.ts` runs Better Auth's adapter suite
(`normal`, `joins`, `transactions`, `case-insensitive`, `auth-flow`) on MySQL
in two lanes, each in its own database:

- **better-auth tables**: every model in Better Auth's shape under Ghost's
  table and column names. Tests the adapter itself.
- **ghost users**: `users`, `user_accounts`, `user_sessions` and
  `verifications` built from `schema.js` with `commands.createTable`, so their
  real types, lengths, indexes and foreign keys are tested, with the virtual
  columns and create defaults. Models the suite renames or tables `schema.js`
  does not define fall back to Better Auth's shape, and `users.id` foreign
  keys follow a renamed user table.

`numberIdTestSuite` and `uuidTestSuite` are not run: Ghost ids are ObjectIds.

Last run (Better Auth 1.7.15, MySQL 8): 480 tests, 465 pass, 15 skipped, 0
fail. Each skip is a test that cannot pass against Ghost's schema. None comes
from the three new tables: their millisecond dates round-trip, and their
foreign keys and `NOT NULL` columns hold for every test.

| Test                                                                                                                                                                                                                                    | Lanes                         | Cause                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `findOne - eq with mode sensitive (default) should not match different case`                                                                                                                                                            | both                          | MySQL's default `_ci` collation compares case-insensitively. A binary collation per query would stop token and email lookups using their indexes, so this is accepted. |
| `create - should create a model`                                                                                                                                                                                                        | ghost users, normal and joins | `users.created_at`/`updated_at` are `DATETIME` without fractional seconds, so dates lose their milliseconds. The new tables use `DATETIME(3)` and are unaffected.      |
| `update - should return null when a multi-predicate where matches no row`, `deleteMany - should delete many models with boolean values`, `findMany - eq and ne operators with null value in AND group should use IS NULL / IS NOT NULL` | ghost users, normal and joins | Virtual `emailVerified` is always `true`, so `false` is never stored or matched.                                                                                       |
| `should successfully sign up`                                                                                                                                                                                                           | ghost users                   | Expects a new user's `emailVerified` to be `false`, for the same reason.                                                                                               |
| `findOne - should find a model with modified field name`, `findOne - should join a model with modified field name`                                                                                                                      | ghost users, normal and joins | The suite renames `users.email`, which Ghost's fixed table cannot follow.                                                                                              |

The virtual columns cost only the tests that store `emailVerified: false`, so
they stay (plan §10).

`test/integration/auth/knex-adapter-ghost.test.ts` covers what the suite
can't, against Ghost's own test database:

- `email_verified` reads `true` for every user, filters on that, and writes
  of either value are dropped without error.
- `two_factor_enabled` is `true` only with a verified `user_two_factors` row.
  The test adds the `twoFactor` plugin's schema, which the instance doesn't
  enable yet.
- `createDefaults` sets `slug` to the id and `password` to `!`, which
  `@tryghost/security` rejects.
- `user_sessions`, `user_accounts` and `verifications` dates keep their
  milliseconds through the adapter.

## Phase 0 findings

Checked against Better Auth 1.7.15 and `@better-auth/api-key` 1.7.15. Recheck
when the catalog version changes.

### API names

| Plan relies on                     | Exact name and behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-only endpoints              | `createAuthEndpoint.serverOnly(options, handler)`. `metadata: { SERVER_ONLY: true }` still works but is deprecated. Either way the HTTP router never registers the route, and `auth.api.*` can still call it.                                                                                                                                                                                                                                                                                                     |
| Headers from a server-side sign-in | `auth.api.signInEmail({body, headers, returnHeaders: true})` returns `{headers, response}`. Passing `request` makes it return a `Response` instead, so compatibility controllers pass `headers` only.                                                                                                                                                                                                                                                                                                             |
| Session cookie with a path         | `advanced.cookies.session_token` with `name` and `attributes.path`. The same attributes set and clear it (sign-out and expiry), and `useSecureCookies` still adds `__Secure-`. The `dont_remember` and `session_data` cookies keep `path: "/"` unless they are configured too.                                                                                                                                                                                                                                    |
| Server-set session fields          | `session.additionalFields.<field>.input: false`. A truthy client value throws `FIELD_NOT_ALLOWED`; a falsy one is dropped. This also covers `/update-session`.                                                                                                                                                                                                                                                                                                                                                    |
| New session in after-hooks         | `ctx.context.newSession`. Set by `setSessionCookie`: in core, `/sign-in/email`, `/sign-up/email`, `/change-password` with `revokeOtherSessions`, `/update-session`, `/update-user`, and a `/get-session` refresh (off for Ghost). Plugins call it too (`magicLink`'s `/magic-link/verify`, `twoFactor`), so verification matches every enabled sign-in endpoint.                                                                                                                                                  |
| Creating a session directly        | `ctx.context.internalAdapter.createSession(userId, dontRememberMe?, override?, overrideAll?)`. Field defaults are applied after `override`, so `{verified: true}` is overwritten by its `defaultValue` unless `overrideAll` is `true`. `createVerifiedSession` and `ghostSso` pass `overrideAll`. Rotations Ghost doesn't call (`/change-password` with `revokeOtherSessions`, `twoFactor` enable and disable) reset `verified` too, so a `session.create.before` hook carries it over from the replaced session. |
| API keys                           | The `apiKey` plugin is the separate `@better-auth/api-key` package, not `better-auth/plugins`. The key getter is `customAPIKeyGetter(ctx)` (default header `x-api-key`, or `apiKeyHeaders`). Permissions are `permissions.defaultPermissions` and `verifyApiKey({body: {key, permissions}})`, as `Record<resource, action[]>`.                                                                                                                                                                                    |

Two notes for Phase 4: `apiKey`'s `references` is `user` or `organization`
only, so a site token's owner needs a decision before `api_tokens` lands, and
several `configId`s can separate Personal Access Tokens from site tokens. Its
session option is `enableSessionForAPIKeys` (default `false`), not
`disableSessionForAPIKeys`.

### Hook transactions

`databaseHooks.*.before` hooks share a transaction only when one is open.
Better Auth's `*WithHooks` wrappers run the hook and then write through
`getCurrentAdapter()`, which is the transaction's adapter if `runWithTransaction`
opened one. `auth.handler` opens none itself. `after` hooks wait for the commit
(`queueAfterTransactionHook`), or run at once outside a transaction.

| Path                                                             | In a transaction             |
| ---------------------------------------------------------------- | ---------------------------- |
| `/sign-in/email` (session create)                                | No                           |
| `/sign-up/email` (disabled)                                      | Yes                          |
| `/change-password`                                               | Yes                          |
| `/reset-password`                                                | Yes                          |
| `/set-password`                                                  | Only if the caller opens one |
| `internalAdapter.createSession`, `updatePassword`, `linkAccount` | Only if the caller opens one |
| `/sign-out`, `/revoke-session(s)`, `/revoke-other-sessions`      | No                           |

`update.before` receives only the update's data and context, never its
`where`, so it cannot tell whose row changed. `/reset-password` creates a
missing credential row, which runs `create` hooks rather than `update` hooks.
A dual write through `databaseHooks` would have to work out the user for each
path. There is none: the legacy engine moves to `user_accounts` in Phase 2
wherever it exists, and the migration that graduates it copies the hashes
(plan §4.5).

Ghost transactions around several Better Auth writes (`createVerifiedSession`)
must use `runWithTransaction` from `@better-auth/core/context`, a direct
dependency, so the hooks see the transaction. Calling the adapter's
`transaction` alone does not. `acceptInvitation` also writes Ghost tables
through Bookshelf, which cannot join Better Auth's transaction: the
transaction adapter does not expose its Knex `trx`. Plan §3.3 needs a bridge
for it before Phase 6. Inside a hook
or plugin, write through `getCurrentAdapter(ctx.context.adapter)` (exported
from `better-auth`); `ctx.context.adapter` is outside the transaction, so a
write through it survives a rollback.

### Decisions

Settled in Phase 0 (plan §10):

- `emailVerified` and `twoFactorEnabled` stay virtual. Real per-user
  verification is a prerequisite for SSO account linking in Phase 8.
- Sessions last 180 days, absolute (`disableSessionRefresh`). Rolling sessions
  come later.
- Email codes are 6 random digits, hashed in `verifications`, expiring after
  5 minutes. Five wrong attempts delete the code; Ghost's rate limiters stay on top.
- Magic link, passkey, TOTP and SSO sign-ins count as verified.
  `require_email_mfa` applies to password sign-in only.
- Scopes use the `object_type:action` permission keys, with finer scopes where
  one key covers more than one capability. They are checked on includes and
  relations too. Phase 4 starts with a spike on both.
- The principal has `kind: 'app'` with `actingFor: User | null` for installed
  apps. It lands with `resolvePrincipal` in Phase 2.
- No `bearer` plugin. Better Auth still returns session tokens in JSON
  without it: a top-level `token` from `/sign-in/email` and
  `/change-password`, `session.token` from `/get-session`, and a `token` on
  each session from `/list-sessions`. A global after-hook strips them from
  every native response before the handler is mounted (Phase 2). Because
  `revokeSession` takes a token, revoking one session (Phase 8) uses a Ghost
  endpoint that takes a session id and checks ownership.
- OAuth clients for apps are Phase 4b, alongside Phase 5.
- Rollback to `legacy` stays possible until 7.0 removes it.
- `/update-session` is disabled.
- `user_accounts` becomes the only password store. Every legacy password
  read and write moves to it in Phase 2 wherever it exists, and the migration
  that graduates it copies `users.password`.

Still open:

- Content API keys: the 8.0 schedule, or public site tokens. Decide in
  Phase 11, during 7.x. They are not removed in 7.0 either way.
- Whether credential rows join content exports. Decide in Phase 10 (7.0).

### Go/no-go

Go for Week 3 (sessions on Better Auth). The adapter suite passes on MySQL,
the instance boots as a service, and every API the plan relies on exists. The
plan is updated for the findings above.
