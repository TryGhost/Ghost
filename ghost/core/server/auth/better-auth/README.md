# Better Auth

Staff authentication on [Better Auth](https://www.better-auth.com), behind the
`auth:engine` config key. See the
[migration plan](../../../../../docs/plans/better-auth-migration.md)
for the design. Nothing here is wired into boot yet.

- `knex-adapter.ts`: a Better Auth database adapter over a Knex instance. It
  imports nothing from Ghost, so it can become a package later. Ghost
  migrations own the DDL, so there is no `createSchema`.
- `ghost-models.ts`: maps Better Auth's `user`, `session`, `account` and
  `verification` models onto `users`, `user_sessions`, `user_accounts` and
  `verifications`, plus the `users` gaps described below.

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
- **ghost users**: `users` built from `schema.js`, with the virtual columns and
  create defaults.

`numberIdTestSuite` and `uuidTestSuite` are not run: Ghost ids are ObjectIds.

Last run (Better Auth 1.7.15, MySQL 8): 480 tests, 465 pass, 15 skipped. Each
skip is a test that cannot pass against Ghost's schema:

| Test                                                                                                                                                                                                                                    | Lanes                         | Cause                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `findOne - eq with mode sensitive (default) should not match different case`                                                                                                                                                            | both                          | MySQL's default `_ci` collation compares case-insensitively. A binary collation per query would stop token and email lookups using their indexes, so this is accepted. |
| `create - should create a model`                                                                                                                                                                                                        | ghost users, normal and joins | `users.created_at`/`updated_at` are `DATETIME` without fractional seconds, so dates lose their milliseconds.                                                           |
| `update - should return null when a multi-predicate where matches no row`, `deleteMany - should delete many models with boolean values`, `findMany - eq and ne operators with null value in AND group should use IS NULL / IS NOT NULL` | ghost users, normal and joins | Virtual `emailVerified` is always `true`, so `false` is never stored or matched.                                                                                       |
| `should successfully sign up`                                                                                                                                                                                                           | ghost users                   | Expects a new user's `emailVerified` to be `false`, for the same reason.                                                                                               |
| `findOne - should find a model with modified field name`, `findOne - should join a model with modified field name`                                                                                                                      | ghost users, normal and joins | The suite renames `users.email`, which Ghost's fixed table cannot follow.                                                                                              |

The virtual columns cost only the tests that store `emailVerified: false`, so
plan §10 open decision 1 does not need real columns on these grounds.
