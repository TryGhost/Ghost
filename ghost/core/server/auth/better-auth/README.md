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
plan §10 open decision 1 does not need real columns on these grounds.

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
